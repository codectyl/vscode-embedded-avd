// Replaces placeholders in the form of {{key}} in the input string
export function template(str: string, data: Record<string, any>): string {
  return str.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    return key in data ? String(data[key]) : "";
  });
}
