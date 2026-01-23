"use strict";
export const appName = "Delta Chat";
export const homePageUrl = "https://delta.chat";
export const gitHubUrl = "https://github.com/deltachat/deltachat-desktop";
export const gitHubIssuesUrl = gitHubUrl + "/issues";
export const gitHubLicenseUrl = gitHubUrl + "/blob/main/LICENSE";
export const donationUrl = "https://delta.chat/donate";
export const appWindowTitle = appName;
export var Timespans = /* @__PURE__ */ ((Timespans2) => {
  Timespans2[Timespans2["ZERO_SECONDS"] = 0] = "ZERO_SECONDS";
  Timespans2[Timespans2["ONE_SECOND"] = 1] = "ONE_SECOND";
  Timespans2[Timespans2["ONE_MINUTE_IN_SECONDS"] = 60] = "ONE_MINUTE_IN_SECONDS";
  Timespans2[Timespans2["ONE_HOUR_IN_SECONDS"] = 3600] = "ONE_HOUR_IN_SECONDS";
  Timespans2[Timespans2["ONE_DAY_IN_SECONDS"] = 86400] = "ONE_DAY_IN_SECONDS";
  Timespans2[Timespans2["ONE_WEEK_IN_SECONDS"] = 604800] = "ONE_WEEK_IN_SECONDS";
  Timespans2[Timespans2["ONE_YEAR_IN_SECONDS"] = 31536e3] = "ONE_YEAR_IN_SECONDS";
  return Timespans2;
})(Timespans || {});
export var AutodeleteDuration = /* @__PURE__ */ ((AutodeleteDuration2) => {
  AutodeleteDuration2[AutodeleteDuration2["NEVER"] = 0 /* ZERO_SECONDS */] = "NEVER";
  AutodeleteDuration2[AutodeleteDuration2["AT_ONCE"] = 1 /* ONE_SECOND */] = "AT_ONCE";
  AutodeleteDuration2[AutodeleteDuration2["ONE_MINUTE"] = 60 /* ONE_MINUTE_IN_SECONDS */] = "ONE_MINUTE";
  AutodeleteDuration2[AutodeleteDuration2["ONE_HOUR"] = 3600 /* ONE_HOUR_IN_SECONDS */] = "ONE_HOUR";
  AutodeleteDuration2[AutodeleteDuration2["ONE_DAY"] = 86400 /* ONE_DAY_IN_SECONDS */] = "ONE_DAY";
  AutodeleteDuration2[AutodeleteDuration2["ONE_WEEK"] = 604800 /* ONE_WEEK_IN_SECONDS */] = "ONE_WEEK";
  AutodeleteDuration2[AutodeleteDuration2["FIVE_WEEKS"] = 3024e3] = "FIVE_WEEKS";
  AutodeleteDuration2[AutodeleteDuration2["ONE_YEAR"] = 31536e3 /* ONE_YEAR_IN_SECONDS */] = "ONE_YEAR";
  return AutodeleteDuration2;
})(AutodeleteDuration || {});
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "apng", "gif", "webp"];
export const VIDEO_CHAT_INSTANCE_SYSTEMLI = "https://meet.systemli.org/$ROOM";
export const VIDEO_CHAT_INSTANCE_AUTISTICI = "https://vc.autistici.org/$ROOM";
export var NOTIFICATION_TYPE = /* @__PURE__ */ ((NOTIFICATION_TYPE2) => {
  NOTIFICATION_TYPE2[NOTIFICATION_TYPE2["MESSAGE"] = 0] = "MESSAGE";
  NOTIFICATION_TYPE2[NOTIFICATION_TYPE2["REACTION"] = 1] = "REACTION";
  NOTIFICATION_TYPE2[NOTIFICATION_TYPE2["WEBXDC_INFO"] = 2] = "WEBXDC_INFO";
  return NOTIFICATION_TYPE2;
})(NOTIFICATION_TYPE || {});
//# sourceMappingURL=constants.js.map
