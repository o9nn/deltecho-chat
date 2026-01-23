"use strict";
export function parseMailto(mailtoURL) {
  const mailto_url = new URL(mailtoURL);
  if (mailto_url.protocol.toLowerCase() !== "mailto:") {
    throw new Error(
      "not a mailto link, doesn't start with 'mailto:': " + mailtoURL
    );
  }
  const query = mailto_url.searchParams;
  const address = mailto_url.pathname || query.get("to") || null;
  return {
    to: address && decodeURIComponent(address).trim(),
    subject: query.get("subject") || void 0,
    body: query.get("body") || void 0
  };
}
//# sourceMappingURL=parse_mailto.js.map
