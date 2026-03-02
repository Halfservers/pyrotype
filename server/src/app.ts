import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { sessionMiddleware } from './services/auth/session';
import { loadUser } from './middleware/loadUser';
import { errorHandler } from './middleware/errorHandler';
import { routes } from './routes';

export const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware
app.use(sessionMiddleware);

// Load user from session into req.user
app.use(loadUser);

// Mount all routes
app.use(routes);

// Global error handler (must be last)
app.use(errorHandler);
