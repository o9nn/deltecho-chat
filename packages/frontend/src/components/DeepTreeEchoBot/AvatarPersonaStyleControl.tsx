import React from "react";
import { useDeepTreeEchoAvatarOptional } from "./DeepTreeEchoAvatarContext";

/** Appearance only: the existing Miara Cubism mesh remains the rendered model. */
export function AvatarPersonaStyleControl() {
  const avatar = useDeepTreeEchoAvatarOptional();
  const adultSelfAttested = avatar?.state.config.adultSelfAttested === true;
  const selected =
    adultSelfAttested &&
    avatar?.state.config.presentationStyle === "lucy-inspired"
      ? "lucy-inspired"
      : "canonical";

  return (
    <section
      aria-label="Optional avatar expression style"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "12px 26px 18px",
      }}
    >
      <h4 style={{ margin: 0 }}>Optional expression style</h4>
      <p style={{ margin: 0, lineHeight: 1.4 }}>
        The Lucy-inspired style is a subtle presentation filter on the existing
        Miara-based Cubism model. It does not install the illustrated Lucy rig,
        change Deep Tree Echo's identity, or enable explicit content.
      </p>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <input
          type="checkbox"
          data-testid="avatar-adult-self-attested"
          checked={adultSelfAttested}
          disabled={!avatar}
          onChange={(event) =>
            avatar?.updateConfig({
              adultSelfAttested: event.target.checked,
              presentationStyle: event.target.checked ? selected : "canonical",
            })
          }
        />
        <span>
          I confirm that I am at least 18 and opt in to an adult character style
        </span>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        Expression style
        <select
          data-testid="avatar-presentation-style"
          aria-label="Avatar presentation style"
          style={{ width: "100%" }}
          disabled={!adultSelfAttested || !avatar}
          value={selected}
          onChange={(event) =>
            avatar?.updateConfig({
              presentationStyle:
                event.target.value === "lucy-inspired"
                  ? "lucy-inspired"
                  : "canonical",
            })
          }
        >
          <option value="canonical">Deep Tree Echo (canonical)</option>
          <option value="lucy-inspired">Lucy-inspired (visual only)</option>
        </select>
      </label>
    </section>
  );
}
