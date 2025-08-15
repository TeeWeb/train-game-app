export default class Player {
  private id: number;
  private color: string;
  private name: string;
  private balance: number = 0;
  private position: number; // Milepost IDs

  constructor(id: number, color: string, name: string, balance: number = 0) {
    this.id = id;
    this.color = color;
    this.name = name;
    this.balance = balance;
    this.position = null;
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

  public updateBalance(amount: number): void {
    this.balance = this.balance + amount;
  }

  public getPosition(): number {
    return this.position;
  }

  public setPosition(position: number): void {
    this.position = position;
  }
}
