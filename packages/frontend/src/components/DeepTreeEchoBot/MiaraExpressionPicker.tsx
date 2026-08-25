import React from "react";
import {
  AVATAR_EXPRESSION_CHOICES,
  LIVE_AVATAR_EXPRESSION,
  resolveAvatarExpression,
  type AvatarExpressionId,
} from "@deltecho/avatar";
import useTranslationFunction from "../../hooks/useTranslationFunction";
import { useDeepTreeEchoAvatarOptional } from "./DeepTreeEchoAvatarContext";

const EXPRESSION_LABELS: Record<string, string> = {
  live: "avatar_expression_live",
  NEUTRAL_Reset: "avatar_expression_neutral",
  JOY_01_BroadSmile: "avatar_expression_smile",
  JOY_02_Laughing: "avatar_expression_laugh",
  JOY_03_GentleSmile: "avatar_expression_gentle",
  SPEAK_01_OpenVowel: "avatar_expression_speak",
  PHOTO_Awe: "avatar_expression_awe",
  SURPRISE_01_Startled: "avatar_expression_surprise",
  WONDER_02_CuriousGaze: "avatar_expression_curious",
  WONDER_03_Contemplative: "avatar_expression_think",
  SADNESS_01_Melancholy: "avatar_expression_sad",
};

export interface MiaraExpressionPickerProps {
  variant?: "compact" | "panel";
}

export function MiaraExpressionPicker({
  variant = "compact",
}: MiaraExpressionPickerProps) {
  const tx = useTranslationFunction();
  const avatar = useDeepTreeEchoAvatarOptional();
  const selected = resolveAvatarExpression(avatar?.state.config.expression);

  const selectExpression = (id: AvatarExpressionId) => {
    avatar?.updateConfig({ expression: id });
    if (id !== LIVE_AVATAR_EXPRESSION) {
      avatar?.controller?.setNamedExpression?.(id);
    }
  };

  return (
    <div
      className={`miara-expression-picker miara-expression-picker--${variant}`}
      data-testid="miara-expression-picker"
    >
      <label className="miara-expression-picker__label">
        <span>{tx("avatar_expression_label")}</span>
        <select
          data-testid="miara-expression-select"
          aria-label={tx("avatar_expression_label")}
          value={selected}
          onChange={(event) =>
            selectExpression(event.target.value as AvatarExpressionId)
          }
        >
          {AVATAR_EXPRESSION_CHOICES.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {tx(EXPRESSION_LABELS[choice.id] ?? choice.label)}
            </option>
          ))}
        </select>
      </label>
      {selected !== LIVE_AVATAR_EXPRESSION && (
        <button
          type="button"
          className="miara-expression-picker__live"
          data-testid="miara-expression-live"
          onClick={() => selectExpression(LIVE_AVATAR_EXPRESSION)}
        >
          {tx("avatar_expression_live")}
        </button>
      )}
    </div>
  );
}

export default MiaraExpressionPicker;
