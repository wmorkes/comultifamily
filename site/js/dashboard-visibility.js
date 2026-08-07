/**
 * Client-visibility toggle for dashboards that can move between "team only"
 * and "team + valid client token" without a code change.
 *
 * Flip a value here and push — that's the whole workflow. true = clients
 * with a valid (non-expired) token can open the dashboard and see its card
 * on the hub; false = only team logins (isTeam) can, same as the other
 * fully-internal dashboards (Capital Flow, On-Market, Loan Monitor, Gap
 * Report), which don't use this file at all.
 *
 * Both the hub (site/dashboards/index.html) and each dashboard's own gate
 * script read this, so turning a dashboard off here also revokes access
 * for anyone with a bookmarked URL or old token link, not just the hub card.
 */
const CLIENT_VISIBLE = {
  'denver-metro': false,
  'sales-by-year': true,
  'deliveries-by-year': false,
  'pipeline': false,
  'rental-trends': false,
  'chfa': false
};
