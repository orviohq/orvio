import config from './playwright.layout-desktop.config';
export default {
  ...config,
  use: {
    ...config.use,
    browserName: 'webkit',
    launchOptions: { executablePath: process.env.ORVIO_WEBKIT_EXECUTABLE },
  },
};
