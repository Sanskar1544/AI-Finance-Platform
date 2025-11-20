import arcjet, { tokenBucket, shield, detectBot } from "@arcjet/next";

// Main Arcjet instance for rate limiting (your existing one)
const aj = arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ["userId"], // Track based on Clerk userId
  rules: [
    // Rate limiting specifically for collection creation
    tokenBucket({
      mode: "LIVE",
      refillRate: 10, // 10 collections
      interval: 3600, // per hour
      capacity: 10, // maximum burst capacity
    }),
  ],
});

// Additional Arcjet instance for general API protection
export const ajProtect = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({
      mode: "LIVE",
    }),
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        "GO_HTTP", // For Inngest
      ],
    }),
  ],
});

// Helper function to protect API routes
export async function protectRoute(req) {
  const decision = await ajProtect.protect(req);
  
  if (decision.isDenied()) {
    return new Response("Forbidden", { status: 403 });
  }
  
  return null; // No error, continue
}

export default aj;