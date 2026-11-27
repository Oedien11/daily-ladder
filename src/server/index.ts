import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './routes/api';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';

const app = new Hono();
const internal = new Hono();

// Never let one bad request kill the server process: Devvit context
// accessors can throw outside Reddit, and a 500 beats a crash.
app.onError((err, c) => {
  console.error('Unhandled server error:', err);
  return c.json({ status: 'error', message: 'Internal server error' }, 500);
});

internal.route('/menu', menu);
internal.route('/triggers', triggers);

app.route('/api', api);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
