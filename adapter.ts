export abstract class Adapter {
  abstract initialize?: () => void | Promise<void> | this | Promise<this>;
  abstract setItems(items: Record<string, string>): void | Promise<void>;
  abstract getItems(): Record<string, string> | Promise<Record<string, string>>;
  abstract deleteItems(items: string[]): void | Promise<void>;
}
