import React from "react";
import {
  AVATAR_IDENTITIES,
  applyAvatarIdentity,
  resolveAvatarIdentity,
  type AvatarIdentityId,
} from "@deltecho/avatar";
import useTranslationFunction from "../../hooks/useTranslationFunction";
import { useDeepTreeEchoAvatarOptional } from "./DeepTreeEchoAvatarContext";

const IDENTITY_LABELS: Record<AvatarIdentityId, string> = {
  miara: "avatar_identity_miara",
  "deep-tree-echo": "avatar_identity_deep_tree_echo",
  melody: "avatar_identity_melody",
};

export interface AvatarIdentityPickerProps {
  variant?: "compact" | "panel";
}

export function AvatarIdentityPicker({
  variant = "compact",
}: AvatarIdentityPickerProps) {
  const tx = useTranslationFunction();
  const avatar = useDeepTreeEchoAvatarOptional();
  const selected = resolveAvatarIdentity(avatar?.state.config.identity);

  const selectIdentity = (id: AvatarIdentityId) => {
    const applied = applyAvatarIdentity(id);
    avatar?.updateConfig({
      identity: applied.identity,
      model: applied.model,
      outfit: applied.outfit.id,
      outfitHiddenGroups: [...applied.outfit.hiddenGroups],
      outfitHueShift: applied.outfit.hueShift,
    });
  };

  return (
    <div
      className={`avatar-identity-picker avatar-identity-picker--${variant}`}
      data-testid="avatar-identity-picker"
    >
      <span className="avatar-identity-picker__label">
        {tx("avatar_identity_label")}
      </span>
      <div
        className="avatar-identity-picker__choices"
        role="radiogroup"
        aria-label={tx("avatar_identity_label")}
      >
        {AVATAR_IDENTITIES.map((identity) => {
          const active = identity.id === selected;
          return (
            <button
              key={identity.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`avatar-identity-picker__choice${
                active ? " is-active" : ""
              }`}
              data-testid={`avatar-identity-${identity.id}`}
              data-identity={identity.id}
              onClick={() => selectIdentity(identity.id)}
            >
              {identity.portrait ? (
                <img
                  src={identity.portrait}
                  alt=""
                  className="avatar-identity-picker__portrait"
                />
              ) : (
                <span className="avatar-identity-picker__portrait is-placeholder">
                  {identity.label.slice(0, 1)}
                </span>
              )}
              <span className="avatar-identity-picker__name">
                {tx(IDENTITY_LABELS[identity.id])}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AvatarIdentityPicker;
