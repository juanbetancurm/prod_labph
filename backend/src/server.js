import { createApp } from "./app.js";
import { loadBackendEnv } from "./env.js";

loadBackendEnv();

const port = Number(process.env.PORT || 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`Physics lab inventory API listening on http://localhost:${port}`);
});

