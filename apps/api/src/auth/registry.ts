import { AuthStrategy } from './types.js';

export class AuthStrategyRegistry {
  private strategies = new Map<string, AuthStrategy>();

  register(strategy: AuthStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  resolve(name: string): AuthStrategy {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Auth strategy "${name}" not registered`);
    }
    return strategy;
  }

  has(name: string): boolean {
    return this.strategies.has(name);
  }
}

export const authRegistry = new AuthStrategyRegistry();
