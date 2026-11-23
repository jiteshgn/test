<#
.SYNOPSIS
  Creates the SharePoint lists used by the assuranceLearningCalendar web part:
    - AssuranceLearningCalendar        the classes (optionally imported from a CSV)
    - AssuranceLearningCalendarAdmins  who sees the Admin panel (Title, Email, IsActive, SuperAdmin)
    - AssuranceLearningCalendarVisits  visit tracking, one item per user
  Running it again is safe: existing lists, columns and items are kept.

.DESCRIPTION
  Requires PnP.PowerShell 2.x+ (Install-Module PnP.PowerShell -Scope CurrentUser)
  and an Entra ID app registration for interactive sign-in (-ClientId).

  The CSV must use the same headers as the Excel export:
    eventName, startDateString, endDateString, startTime, endTime, CPECredits, Tduration,
    trainingType, timeZone, RegistrationLink, AboutCourse, Objectives, recordedLink, offering, Region
  Save the real Excel sheet as "CSV UTF-8" to import it.

.EXAMPLE
  .\Provision-AssuranceLearningCalendarList.ps1 -SiteUrl https://contoso.sharepoint.com/sites/learning -ClientId <app-id>

.EXAMPLE
  .\Provision-AssuranceLearningCalendarList.ps1 -SiteUrl https://contoso.sharepoint.com/sites/learning -ClientId <app-id> `
      -CsvPath .\AssuranceLearningCalendar.sample.csv

.EXAMPLE
  # Also add the first Super Admin and let site visitors record their visits.
  .\Provision-AssuranceLearningCalendarList.ps1 -SiteUrl https://contoso.sharepoint.com/sites/learning -ClientId <app-id> `
      -SuperAdminEmail first.admin@contoso.com -SuperAdminName 'First Admin' -AllowVisitorsToRecordVisits
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string] $SiteUrl,
  [Parameter(Mandatory = $true)] [string] $ClientId,
  [string] $ListName = 'AssuranceLearningCalendar',
  [string] $CsvPath,
  [switch] $ClearExistingItems,
  [string] $AdminListName = 'AssuranceLearningCalendarAdmins',
  [string] $VisitsListName = 'AssuranceLearningCalendarVisits',
  # Added to the admin list as an active Super Admin (if not there yet).
  [string] $SuperAdminEmail,
  [string] $SuperAdminName,
  # Gives the site's Visitors group Contribute on the visits list only, so every visitor's visit can be saved.
  [switch] $AllowVisitorsToRecordVisits
)

$ErrorActionPreference = 'Stop'

Connect-PnPOnline -Url $SiteUrl -ClientId $ClientId -Interactive

# ---------- list ----------
$list = Get-PnPList -Identity $ListName -ErrorAction SilentlyContinue
if (-not $list) {
  Write-Host "Creating list '$ListName'..." -ForegroundColor Cyan
  $list = New-PnPList -Title $ListName -Template GenericList -EnableVersioning
}
Set-PnPField -List $ListName -Identity 'Title' -Values @{ Title = 'Course Title' } | Out-Null

# ---------- columns ----------
$fields = @(
  '<Field Type="DateTime" Name="StartDate" StaticName="StartDate" DisplayName="Start Date" Format="DateOnly" FriendlyDisplayFormat="Disabled" Required="TRUE" />',
  '<Field Type="DateTime" Name="EndDate" StaticName="EndDate" DisplayName="End Date" Format="DateOnly" FriendlyDisplayFormat="Disabled" Required="TRUE" />',
  '<Field Type="Text" Name="StartTime" StaticName="StartTime" DisplayName="Start Time" MaxLength="20" Description="e.g. 01:00 PM" />',
  '<Field Type="Text" Name="EndTime" StaticName="EndTime" DisplayName="End Time" MaxLength="20" Description="e.g. 02:15 PM" />',
  '<Field Type="Choice" Name="TimeZone" StaticName="TimeZone" DisplayName="Time Zone" FillInChoice="TRUE"><CHOICES><CHOICE>ET</CHOICE><CHOICE>CT</CHOICE><CHOICE>MT</CHOICE><CHOICE>PT</CHOICE><CHOICE>IST</CHOICE></CHOICES><Default>ET</Default></Field>',
  '<Field Type="Number" Name="CPECredits" StaticName="CPECredits" DisplayName="CPE Credits" Decimals="1" Min="0" />',
  '<Field Type="Number" Name="Duration" StaticName="Duration" DisplayName="Duration (hours)" Decimals="1" Min="0" />',
  '<Field Type="Choice" Name="TrainingType" StaticName="TrainingType" DisplayName="Training Type" FillInChoice="TRUE"><CHOICES><CHOICE>Virtual</CHOICE><CHOICE>In-Person</CHOICE></CHOICES><Default>Virtual</Default></Field>',
  '<Field Type="Text" Name="DeliveryType" StaticName="DeliveryType" DisplayName="Delivery Type" MaxLength="50"><Default>Virtual Live</Default></Field>',
  '<Field Type="URL" Name="RegistrationLink" StaticName="RegistrationLink" DisplayName="Registration Link" Format="Hyperlink" />',
  '<Field Type="Note" Name="AboutCourse" StaticName="AboutCourse" DisplayName="About Course" NumLines="6" RichText="FALSE" UnlimitedLengthInDocumentLibrary="FALSE" />',
  '<Field Type="Note" Name="Objectives" StaticName="Objectives" DisplayName="Objectives" NumLines="6" RichText="FALSE" />',
  '<Field Type="URL" Name="RecordedLink" StaticName="RecordedLink" DisplayName="Recorded Link" Format="Hyperlink" />',
  '<Field Type="Choice" Name="Offering" StaticName="Offering" DisplayName="Offering" FillInChoice="TRUE"><CHOICES><CHOICE>Controls</CHOICE><CHOICE>Internal Audit</CHOICE><CHOICE>Internal Audit and Controls</CHOICE><CHOICE>Specialized Assurance</CHOICE><CHOICE>Specialized Assurance and Controls</CHOICE></CHOICES></Field>',
  '<Field Type="Choice" Name="Region" StaticName="Region" DisplayName="Region" FillInChoice="TRUE"><CHOICES><CHOICE>US</CHOICE><CHOICE>US, USI</CHOICE><CHOICE>USI</CHOICE></CHOICES></Field>',
  '<Field Type="Boolean" Name="IsActive" StaticName="IsActive" DisplayName="Is Active" Description="No = hidden from the calendar (made inactive in the Admin panel)"><Default>1</Default></Field>'
)

foreach ($xml in $fields) {
  $name = ([xml]$xml).Field.Name
  if (-not (Get-PnPField -List $ListName -Identity $name -ErrorAction SilentlyContinue)) {
    Write-Host "  + $name"
    Add-PnPFieldFromXml -List $ListName -FieldXml $xml | Out-Null
  }
}

# ---------- default view ----------
$viewFields = @('LinkTitle', 'StartDate', 'EndDate', 'StartTime', 'EndTime', 'TimeZone', 'CPECredits', 'Duration',
  'TrainingType', 'Offering', 'Region', 'RegistrationLink', 'IsActive')
$view = Get-PnPView -List $ListName | Where-Object { $_.DefaultView }
Set-PnPView -List $ListName -Identity $view.Id -Fields $viewFields `
  -Values @{ ViewQuery = '<OrderBy><FieldRef Name="StartDate" Ascending="TRUE" /></OrderBy>' } | Out-Null

# ---------- admin panel lists ----------
function Add-ListWithFields([string] $Title, [string] $TitleDisplayName, [string[]] $FieldXml) {
  if (-not (Get-PnPList -Identity $Title -ErrorAction SilentlyContinue)) {
    Write-Host "Creating list '$Title'..." -ForegroundColor Cyan
    New-PnPList -Title $Title -Template GenericList | Out-Null
  }
  Set-PnPField -List $Title -Identity 'Title' -Values @{ Title = $TitleDisplayName } | Out-Null
  foreach ($xml in $FieldXml) {
    $name = ([xml]$xml).Field.Name
    if (-not (Get-PnPField -List $Title -Identity $name -ErrorAction SilentlyContinue)) {
      Write-Host "  + $name"
      Add-PnPFieldFromXml -List $Title -FieldXml $xml | Out-Null
    }
  }
}

Add-ListWithFields $AdminListName 'Name' @(
  '<Field Type="Text" Name="Email" StaticName="Email" DisplayName="Email" MaxLength="255" Required="TRUE" />',
  '<Field Type="Boolean" Name="IsActive" StaticName="IsActive" DisplayName="Is Active"><Default>1</Default></Field>',
  '<Field Type="Boolean" Name="SuperAdmin" StaticName="SuperAdmin" DisplayName="Super Admin"><Default>0</Default></Field>'
)

Add-ListWithFields $VisitsListName 'User Name' @(
  '<Field Type="Text" Name="Email" StaticName="Email" DisplayName="Email" MaxLength="255" Indexed="TRUE" />',
  '<Field Type="DateTime" Name="LastVisited" StaticName="LastVisited" DisplayName="Last Visited" Format="DateTime" />',
  '<Field Type="Text" Name="Location" StaticName="Location" DisplayName="Location" MaxLength="255" />',
  '<Field Type="Number" Name="VisitCount" StaticName="VisitCount" DisplayName="Visits" Decimals="0" Min="0" />',
  '<Field Type="Number" Name="TimeSpentSeconds" StaticName="TimeSpentSeconds" DisplayName="Time Spent (Seconds)" Decimals="0" Min="0" />'
)
# The web part looks visitors up by email; the index keeps that working past 5,000 users.
Set-PnPField -List $VisitsListName -Identity 'Email' -Values @{ Indexed = $true } | Out-Null

if ($SuperAdminEmail) {
  $email = $SuperAdminEmail.Trim().ToLower()
  $existing = Get-PnPListItem -List $AdminListName -PageSize 500 | Where-Object { "$($_['Email'])".ToLower() -eq $email }
  if (-not $existing) {
    $name = if ($SuperAdminName) { $SuperAdminName } else { $email }
    Add-PnPListItem -List $AdminListName -Values @{ Title = $name; Email = $email; IsActive = $true; SuperAdmin = $true } | Out-Null
    Write-Host "Added Super Admin $email" -ForegroundColor Green
  }
}

if ($AllowVisitorsToRecordVisits) {
  $visitors = Get-PnPGroup -AssociatedVisitorGroup
  Set-PnPList -Identity $VisitsListName -BreakRoleInheritance -CopyRoleAssignments | Out-Null
  Set-PnPListPermission -Identity $VisitsListName -Group $visitors -AddRole 'Contribute' | Out-Null
  Write-Host "'$($visitors.Title)' can now add and edit items in '$VisitsListName' (only that list)." -ForegroundColor Yellow
}

# ---------- import ----------
if ($CsvPath) {
  if ($ClearExistingItems) {
    Write-Host 'Removing existing items...' -ForegroundColor Yellow
    Get-PnPListItem -List $ListName -PageSize 500 | ForEach-Object { Remove-PnPListItem -List $ListName -Identity $_.Id -Force }
  }

  $culture = [Globalization.CultureInfo]::InvariantCulture
  function Convert-Date([string] $value) {
    # dd-MM-yyyy at noon, so the date never shifts with time zones.
    $d = [datetime]::ParseExact($value.Trim(), @('dd-MM-yyyy', 'd-M-yyyy', 'dd/MM/yyyy'), $culture, 'None')
    return $d.Date.AddHours(12)
  }
  function Split-Time([string] $value) {
    if ($value -match '^\s*(.*?)\s*\(([^)]+)\)\s*$') { return @($Matches[1], $Matches[2]) }
    return @($value.Trim(), '')
  }
  function Convert-Url([string] $value, [string] $text) {
    $v = "$value".Trim()
    if (-not $v -or $v -eq 'NA') { return $null }
    return "$v, $text"
  }

  $rows = Import-Csv -Path $CsvPath -Encoding UTF8
  $i = 0
  foreach ($row in $rows) {
    $i++
    $start = Split-Time $row.startTime
    $end = Split-Time $row.endTime
    $zone = if ($row.timeZone) { $row.timeZone.Trim() } else { $start[1] }

    $values = @{
      Title        = $row.eventName.Trim()
      StartDate    = Convert-Date $row.startDateString
      EndDate      = Convert-Date $(if ($row.endDateString) { $row.endDateString } else { $row.startDateString })
      StartTime    = $start[0]
      EndTime      = $end[0]
      TimeZone     = $zone
      CPECredits   = [double]::Parse(("0" + $row.CPECredits).Trim(), $culture)
      Duration     = [double]::Parse(("0" + $row.Tduration).Trim(), $culture)
      TrainingType = $(if ($row.trainingType) { $row.trainingType.Trim() } else { 'Virtual' })
      DeliveryType = 'Virtual Live'
      AboutCourse  = $row.AboutCourse
      Objectives   = $row.Objectives
      Offering     = $row.offering
      Region       = $row.Region
    }
    $reg = Convert-Url $row.RegistrationLink 'Register'
    if ($reg) { $values.RegistrationLink = $reg }
    $rec = Convert-Url $row.recordedLink 'Recording'
    if ($rec) { $values.RecordedLink = $rec }

    Add-PnPListItem -List $ListName -Values $values | Out-Null
    Write-Host ("  [{0}/{1}] {2}" -f $i, $rows.Count, $values.Title)
  }
  Write-Host "Imported $i item(s)." -ForegroundColor Green
}

Write-Host "Lists '$ListName', '$AdminListName' and '$VisitsListName' are ready at $SiteUrl" -ForegroundColor Green
