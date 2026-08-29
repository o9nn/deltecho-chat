import React, { useMemo, useState } from "react";
import {
  MIARA_OUTFIT_PRESETS,
  MIARA_PART_GROUPS,
  outfitFromCustomAdjustments,
  resolveMiaraOutfit,
  type MiaraOutfitId,
  type MiaraOutfitState,
  type MiaraPartGroup,
} from "@deltecho/avatar";
import type { TranslationKey } from "@deltachat-desktop/shared/translationKeyType";
import useTranslationFunction from "../../hooks/useTranslationFunction";
import { useDeepTreeEchoAvatarOptional } from "./DeepTreeEchoAvatarContext";

const PART_GROUP_LABELS: Record<MiaraPartGroup, TranslationKey> = {
  fairy: "miara_outfit_group_fairy",
  hairAccessory: "miara_outfit_group_hair_accessory",
  chestCloth: "miara_outfit_group_chest_cloth",
  sparkle: "miara_outfit_group_sparkle",
  water: "miara_outfit_group_water",
  background: "miara_outfit_group_background",
};

const PRESET_LABELS: Record<
  Exclude<MiaraOutfitId, "custom">,
  TranslationKey
> = {
  official: "miara_outfit_official",
  casual: "miara_outfit_casual",
  lagoon: "miara_outfit_lagoon",
  fairy: "miara_outfit_fairy",
  unadorned: "miara_outfit_unadorned",
  rose: "miara_outfit_rose",
  midnight: "miara_outfit_midnight",
  gold: "miara_outfit_gold",
  grove: "miara_outfit_grove",
  aria: "miara_outfit_aria",
};

export interface MiaraOutfitPickerProps {
  variant?: "compact" | "panel";
  onOutfitChange?: (outfit: MiaraOutfitState) => void;
}

export function MiaraOutfitPicker({
  variant = "compact",
  onOutfitChange,
}: MiaraOutfitPickerProps) {
  const tx = useTranslationFunction();
  const avatar = useDeepTreeEchoAvatarOptional();
  const [customizeOpen, setCustomizeOpen] = useState(variant === "panel");

  const outfit = useMemo(
    () =>
      resolveMiaraOutfit({
        id: avatar?.state.config.outfit,
        hiddenGroups: avatar?.state.config.outfitHiddenGroups,
        hueShift: avatar?.state.config.outfitHueShift,
      }),
    [
      avatar?.state.config.outfit,
      avatar?.state.config.outfitHiddenGroups,
      avatar?.state.config.outfitHueShift,
    ],
  );

  const commit = (next: MiaraOutfitState) => {
    avatar?.updateConfig({
      outfit: next.id,
      outfitHiddenGroups: [...next.hiddenGroups],
      outfitHueShift: next.hueShift,
    });
    onOutfitChange?.(next);
  };

  const selectPreset = (id: MiaraOutfitId) => {
    commit(resolveMiaraOutfit({ id }));
  };

  const toggleGroup = (group: MiaraPartGroup) => {
    const hidden = outfit.hiddenGroups.includes(group)
      ? outfit.hiddenGroups.filter((item) => item !== group)
      : [...outfit.hiddenGroups, group];
    commit(
      outfitFromCustomAdjustments({
        hiddenGroups: hidden,
        hueShift: outfit.hueShift,
      }),
    );
  };

  const setHue = (hueShift: number) => {
    commit(
      outfitFromCustomAdjustments({
        hiddenGroups: outfit.hiddenGroups,
        hueShift,
      }),
    );
  };

  return (
    <div
      className={`miara-outfit-picker miara-outfit-picker--${variant}`}
      data-testid="miara-outfit-picker"
    >
      <label className="miara-outfit-picker__label">
        <span>{tx("miara_outfit_label")}</span>
        <select
          data-testid="miara-outfit-select"
          aria-label={tx("miara_outfit_label")}
          value={outfit.id}
          onChange={(event) =>
            selectPreset(event.target.value as MiaraOutfitId)
          }
        >
          {MIARA_OUTFIT_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {tx(PRESET_LABELS[preset.id])}
            </option>
          ))}
          {outfit.id === "custom" && (
            <option value="custom">{tx("miara_outfit_custom")}</option>
          )}
        </select>
      </label>
      {variant === "compact" && (
        <button
          type="button"
          className="miara-outfit-picker__customize-toggle"
          data-testid="miara-outfit-customize-toggle"
          aria-expanded={customizeOpen}
          onClick={() => setCustomizeOpen((open) => !open)}
        >
          {tx("miara_outfit_customize")}
        </button>
      )}
      {customizeOpen && (
        <div
          className="miara-outfit-picker__customize"
          data-testid="miara-outfit-customize"
        >
          {MIARA_PART_GROUPS.map((group) => {
            const visible = !outfit.hiddenGroups.includes(group);
            return (
              <label key={group} className="miara-outfit-picker__toggle">
                <input
                  type="checkbox"
                  data-testid={`miara-outfit-group-${group}`}
                  checked={visible}
                  onChange={() => toggleGroup(group)}
                />
                <span>{tx(PART_GROUP_LABELS[group])}</span>
              </label>
            );
          })}
          <label className="miara-outfit-picker__hue">
            <span>{tx("miara_outfit_hue")}</span>
            <input
              type="range"
              min={0}
              max={359}
              value={outfit.hueShift}
              data-testid="miara-outfit-hue"
              aria-label={tx("miara_outfit_hue")}
              onChange={(event) => setHue(Number(event.target.value))}
            />
            <span data-testid="miara-outfit-hue-value">{outfit.hueShift}°</span>
          </label>
        </div>
      )}
    </div>
  );
}

export default MiaraOutfitPicker;
