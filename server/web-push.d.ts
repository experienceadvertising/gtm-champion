declare module 'web-push' {
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function sendNotification(subscription: { endpoint: string; keys: any }, payload: string): Promise<any>;
}
