import * as userRepo from "@/lib/repositories/user.repository";

export async function getBudget(userId: string): Promise<number | null> {
  const settings = await userRepo.getUserSettings(userId);
  return settings.monthlyBudget;
}

export async function getGajiDay(userId: string): Promise<number> {
  const settings = await userRepo.getUserSettings(userId);
  return settings.gajiDay;
}

export async function setBudget(userId: string, amount: number | null): Promise<void> {
  await userRepo.updateBudget(userId, amount);
}

export async function setGajiDay(userId: string, day: number): Promise<void> {
  await userRepo.updateGajiDay(userId, day);
}

export async function getUserSettings(userId: string) {
  return userRepo.getUserSettings(userId);
}
