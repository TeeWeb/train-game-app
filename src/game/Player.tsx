export default class Player {
  private id: number;
  private color: string;
  private name: string;
  private balance: number = 0;

  constructor(id: number, color: string, name: string, balance: number = 0) {
    this.id = id;
    this.color = color;
    this.name = name;
    this.balance = balance;
  }

  public getId(): number {
    return this.id;
  }

  public getColor(): string {
    return this.color;
  }

  public getName(): string {
    return this.name;
  }

  public getBalance(): number {
    return this.balance;
  }

  public setBalance(amount: number): void {
    this.balance = amount;
  }

  public addToBalance(amount: number): void {
    this.balance += amount;
  }

  public subtractFromBalance(amount: number): void {
    this.balance -= amount;
  }
}
