/** GET /health — liveness plus room/user gauges for dashboards. */
export const createHealthController = (store) => (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    ...store.stats(),
  });
};
