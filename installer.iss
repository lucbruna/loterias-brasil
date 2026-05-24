; Loterias Brasil — Inno Setup Script
; Compile: ISCC installer.iss

#define MyAppName "Loterias Brasil"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "Loterias Brasil"
#define MyAppURL "https://loteriasbrasil.app"
#define MyAppExeName "LoteriasBrasil.exe"

[Setup]
AppId={A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=
InfoBeforeFile=
OutputDir=.\dist
OutputBaseFilename=LoteriasBrasil_Setup_v{#MyAppVersion}
SetupIconFile=.\public\icon.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
WizardSmallImageFile=.\public\icon-192.bmp
WizardSizePercent=100
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\icon.ico
UninstallDisplayName={#MyAppName}
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na &Área de Trabalho"; GroupDescription: "Atalhos:"; Flags: checkedonce
Name: "startmenuicon"; Description: "Criar atalho no &Menu Iniciar"; GroupDescription: "Atalhos:"; Flags: checkedonce

[Files]
Source: ".\dist\index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\dist\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\dist\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\dist\icon-192.png"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\dist\icon-512.png"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\dist\manifest.json"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\dist\sw.js"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\launcher.bat"; DestDir: "{app}"; DestName: "LoteriasBrasil.exe"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"; Comment: "{#MyAppName} — Análise Inteligente de Loterias"
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"; IconFilename: "{app}\icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"; Comment: "{#MyAppName} — Análise Inteligente de Loterias"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Iniciar {#MyAppName} agora"; Flags: postinstall nowait skipifsilent shellexec

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpSelectDir then
    WizardForm.DirEdit.Text := ExpandConstant('{autopf}\{#MyAppName}');
end;
