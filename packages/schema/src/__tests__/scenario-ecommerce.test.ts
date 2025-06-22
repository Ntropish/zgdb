import { s, validate } from "../s";

describe("E-commerce Order Processing Scenario", () => {
  // =================================================================================
  // Schema Definitions
  // =================================================================================

  const AddressSchema = s.object({
    street: s.string,
    city: s.string,
    state: s(s.string, s.exactLength(2)),
    zipCode: s(s.string, s.regex(/^[0-9]{5}(?:-[0-9]{4})?$/)),
    country: s(s.string, s.exactLength(2)),
  });

  const CustomerSchema = s.object({
    id: s(s.string, s.uuid),
    firstName: s.string,
    lastName: s.string,
    email: s(s.string, s.email),
    phone: s.string.optional(),
    createdAt: s(s.string, s.datetime),
  });

  const ProductSchema = s.object({
    id: s(s.string, s.cuid2),
    name: s(s.string, s.minLength(3)),
    description: s.string,
    price: s(s.number, s.positive()),
    weightLbs: s(s.number, s.positive()).optional(),
  });

  const OrderItemSchema = s.object({
    product: ProductSchema,
    quantity: s(s.number, s.int(), s.positive()),
    appliedDiscount: s(s.number, s.min(0), s.max(1)).optional(),
  });

  const PaymentInfoSchema = s.union([
    s.object({
      method: s.literal("credit_card"),
      last4: s(s.string, s.exactLength(4)),
      cardType: s.enum(["visa", "mastercard", "amex"]),
      transactionId: s.string,
    }),
    s.object({
      method: s.literal("paypal"),
      email: s(s.string, s.email),
      transactionId: s.string,
    }),
    s.object({
      method: s.literal("gift_card"),
      cardId: s.string,
    }),
  ]);

  const OrderStatusSchema = s.union([
    s.object({ status: s.literal("pending") }),
    s.object({ status: s.literal("processing") }),
    s.object({
      status: s.literal("shipped"),
      trackingNumber: s.string,
      shippedAt: s(s.string, s.datetime),
    }),
    s.object({
      status: s.literal("delivered"),
      deliveredAt: s(s.string, s.datetime),
      signedBy: s.string,
    }),
    s.object({
      status: s.literal("cancelled"),
      cancelledAt: s(s.string, s.datetime),
      reason: s.string,
    }),
  ]);

  const FullOrderSchema = s.object({
    orderId: s(s.string, s.ulid),
    customer: CustomerSchema,
    items: s(s.array(OrderItemSchema), s.minLength(1)),
    shippingAddress: AddressSchema,
    billingAddress: AddressSchema,
    payment: PaymentInfoSchema,
    statusHistory: s.array(OrderStatusSchema),
    createdAt: s(s.string, s.datetime),
    metadata: s.object({
      source: s.string,
      campaignId: s.string.optional(),
      ipAddress: s(s.string, s.ip({ version: "v4" })),
    }),
  });

  // =================================================================================
  // Test Data
  // =================================================================================

  const validOrderData: s.infer<typeof FullOrderSchema> = {
    orderId: "01H8X8Z9N6B5V5T4C3R2E1A0S9",
    customer: {
      id: "a8e6e2e5-6b0f-4b0e-9f3b-0e1b6d1d2c3d",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane.doe@example.com",
      phone: "123-456-7890",
      createdAt: "2023-01-15T10:00:00Z",
    },
    items: [
      {
        product: {
          id: "tz4a98xxat96iws9zmbrgj3a",
          name: "Super-Widget 9000",
          description: "The best widget for all your widgeting needs.",
          price: 99.99,
          weightLbs: 2.5,
        },
        quantity: 2,
        appliedDiscount: 0.1,
      },
      {
        product: {
          id: "a1b2c3d4e5f6g7h8i9j0k1l2",
          name: "Mega-Gadget Pro",
          description: "A professional-grade gadget.",
          price: 199.5,
          weightLbs: undefined,
        },
        quantity: 1,
        appliedDiscount: 0.1,
      },
    ],
    shippingAddress: {
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zipCode: "12345",
      country: "US",
    },
    billingAddress: {
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zipCode: "12345",
      country: "US",
    },
    payment: {
      method: "credit_card",
      last4: "4242",
      cardType: "visa",
      transactionId: "pi_3JZs5w2eZvKYlo2C1A3B4D5E",
    },
    statusHistory: [
      { status: "pending" },
      { status: "processing" },
      {
        status: "shipped",
        trackingNumber: "1Z999AA10123456784",
        shippedAt: "2023-01-16T14:30:00Z",
      },
    ],
    createdAt: "2023-01-16T11:00:00Z",
    metadata: {
      source: "web",
      campaignId: "SUMMER_SALE_2023",
      ipAddress: "192.168.1.100",
    },
  };

  // =================================================================================
  // Tests
  // =================================================================================

  it("should successfully validate a correct and complex order object", async () => {
    const result = await validate(FullOrderSchema, validOrderData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validOrderData);
    }
  });

  it("should fail validation for an incorrect nested property", async () => {
    const invalidData = {
      ...validOrderData,
      shippingAddress: {
        ...validOrderData.shippingAddress,
        zipCode: "12345-abc", // Invalid zip code format
      },
    };
    const result = await validate(FullOrderSchema, invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toHaveLength(1);
      expect(result.error[0].path).toEqual(["shippingAddress", "zipCode"]);
      expect(result.error[0].message).toBe(
        "String does not match expected format."
      );
    }
  });

  it("should fail validation for an incorrect item in an array", async () => {
    const invalidData = {
      ...validOrderData,
      items: [
        ...validOrderData.items,
        {
          product: {
            id: "a1b2c3d4e5f6g7h8i9j0k1l2",
            name: "Faulty Item",
            description: "This item has a negative quantity.",
            price: 10.0,
          },
          quantity: -1, // Invalid quantity
        },
      ],
    };
    const result = await validate(FullOrderSchema, invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toHaveLength(1);
      expect(result.error[0].path).toEqual(["items", 2, "quantity"]);
      expect(result.error[0].message).toBe("Number must be positive.");
    }
  });

  it("should fail validation for an incorrect discriminated union value", async () => {
    const invalidData = {
      ...validOrderData,
      payment: {
        method: "paypal",
        email: "not-an-email", // Invalid email
        transactionId: "txn_12345",
      },
    };
    const result = await validate(FullOrderSchema, invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      // It will have two errors: one from the 'credit_card' branch failing, and one from the 'paypal' branch failing.
      expect(result.error.length).toBeGreaterThan(0);
      const emailError = result.error.find(
        (e) => e.path?.join(".") === "payment.email"
      );
      expect(emailError).toBeDefined();
      expect(emailError?.message).toBe("Invalid email");
    }
  });
});
