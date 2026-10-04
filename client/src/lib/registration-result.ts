export interface AcceptedRegistration {
  userId: string;
  email: string;
  fullName: string;
  isPremium: boolean;
  newlyCreated: boolean;
}

export function acceptedRegistration(status: number, value: unknown): AcceptedRegistration {
  const result = value as Partial<AcceptedRegistration> | null;
  if ((status !== 200 && status !== 201) || !result ||
      typeof result.userId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.userId) ||
      typeof result.email !== "string" || typeof result.fullName !== "string" || typeof result.isPremium !== "boolean") {
    throw new Error("We could not confirm your account. Please try signing in.");
  }
  return { ...result, newlyCreated: status === 201 } as AcceptedRegistration;
}
