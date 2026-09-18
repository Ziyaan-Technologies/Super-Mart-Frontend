export function can(action: string, subject: string) {
  const app = (window as any).$app;
  return !!app?.config.globalProperties.$can(action, subject);
}
