export const sanitiseHostname = (s: string) =>
  s ? s.replace(/:443(?=\/|$)/, '').replace(/(.*?\.gov\.uk).*/, '$1') : ''
