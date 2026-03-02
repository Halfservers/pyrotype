import { app } from './app';
import { config } from './config';
import { logger } from './config/logger';

const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info(`Pyrotype server running on port ${PORT}`);
});
