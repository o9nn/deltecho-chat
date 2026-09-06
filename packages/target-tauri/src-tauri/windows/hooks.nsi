; https://tauri.app/distribute/windows-installer/#extending-the-installer

; Defines a macro to register as a handler for a URI scheme.
; Adapted from Tauri's NSIS bundler templates.
!macro URI_SCHEME protocol
    WriteRegStr SHCTX "Software\Classes\${protocol}" "URL Protocol" ""
    WriteRegStr SHCTX "Software\Classes\${protocol}" "" "URL:${BUNDLEID} protocol"
    WriteRegStr SHCTX "Software\Classes\${protocol}\DefaultIcon" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0"
    WriteRegStr SHCTX "Software\Classes\${protocol}\shell\open\command" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\""
!macroend

; Defines a macro to remove a URI handler only when this installation owns it.
!macro REMOVE_URI_SCHEME protocol
    ReadRegStr $R7 SHCTX "Software\Classes\${protocol}\shell\open\command" ""
    ${If} $R7 == "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\""
      DeleteRegKey SHCTX "Software\Classes\${protocol}"
    ${EndIf}
!macroend

; Runs before copying files, setting registry key values, and creating shortcuts.
!macro NSIS_HOOK_PREINSTALL
!macroend

; Runs after the installer has copied files and created shortcuts.
!macro NSIS_HOOK_POSTINSTALL
    ; DeltEcho intentionally does not claim `.xdc` or standard Delta Chat URI
    ; handlers. This allows a standard Delta Chat installation to retain them.
    !insertmacro URI_SCHEME "deltecho-account"
    !insertmacro URI_SCHEME "deltecho-login"
    !insertmacro URI_SCHEME "deltecho-notification"
!macroend

; Runs before removing files, registry keys, and shortcuts.
!macro NSIS_HOOK_PREUNINSTALL
    !insertmacro REMOVE_URI_SCHEME "deltecho-account"
    !insertmacro REMOVE_URI_SCHEME "deltecho-login"
    !insertmacro REMOVE_URI_SCHEME "deltecho-notification"
!macroend

; Runs after files, registry keys, and shortcuts have been removed.
!macro NSIS_HOOK_POSTUNINSTALL
!macroend
