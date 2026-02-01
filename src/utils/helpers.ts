export function template(str: string, data: Record<string, unknown>): string {
  return str.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    return key in data ? String(data[key]) : '';
  });
}

export function generateRandomString({ length = 32 }): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
