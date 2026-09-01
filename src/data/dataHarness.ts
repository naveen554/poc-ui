import {
  ManualReviewRecord,
  ReviewQuestionGroup,
  SystemFeed } from
'../types';

export const reviewQuestionGroups: ReviewQuestionGroup[] = [
{
  id: 'eligibility-letter',
  title: 'Eligibility Letter Timeliness',
  standard: 'Mailed within 5 business days of the leave request',
  slaDays: 5,
  questions: [
  {
    id: 'elig-timely',
    label: 'Letter mailed timely?',
    helper: 'Compare the mail date on the eligibility letter to the leave request date.'
  },
  {
    id: 'elig-content',
    label: 'Letter content accurate and complete?',
    helper: 'Rights & responsibilities, certification due date and contact details present.'
  }]

},
{
  id: 'decision-letter',
  title: 'Decision Letter Timeliness',
  standard: 'Mailed within 5 business days of receipt of complete certification',
  slaDays: 5,
  questions: [
  {
    id: 'dec-timely',
    label: 'Letter mailed timely?',
    helper: 'Measured from the date the complete medical certification was received.'
  },
  {
    id: 'dec-accuracy',
    label: 'Decision matches plan provisions?',
    helper: 'Approved / denied dates align with certification and policy terms.'
  }]

},
{
  id: 'leave-setup',
  title: 'Leave Set-Up Accuracy',
  standard: 'Leave type, dates and hours keyed correctly at intake',
  slaDays: null,
  questions: [
  { id: 'setup-type', label: 'Correct leave type and reason selected?' },
  { id: 'setup-dates', label: 'Leave begin / end dates entered accurately?' },
  { id: 'setup-hours', label: 'Intermittent hours or schedule loaded correctly?' }]

},
{
  id: 'preliminary-email',
  title: 'Preliminary Notification',
  standard: 'Preliminary email sent to the FML teams within 1 business day',
  slaDays: 1,
  questions: [
  { id: 'prelim-sent', label: 'Preliminary email sent to FML teams?' },
  { id: 'prelim-timely', label: 'Sent within 1 business day of notice?' }]

},
{
  id: 'documentation',
  title: 'Documentation & Notes Quality',
  standard: 'System notes are complete, accurate and contemporaneous',
  slaDays: null,
  questions: [
  { id: 'doc-notes', label: 'Notes support every action taken on the leave?' },
  { id: 'doc-imaging', label: 'All correspondence imaged to the correct leave ID?' }]

},
{
  id: 'customer-contact',
  title: 'Customer Communication',
  standard: 'Employee contacted per the service standard',
  slaDays: 3,
  questions: [
  { id: 'contact-attempt', label: 'Outreach attempted per standard?' },
  { id: 'contact-tone', label: 'Communication clear, empathetic and jargon free?' }]

}];


export const manualReviewRecords: ManualReviewRecord[] = [
{
  id: 'MR-1041',
  lob: 'FML',
  quarter: '1Q25',
  policyNumber: 'FML0985406',
  groupName: 'BayCare Health System',
  auditorInitials: 'DR',
  dateReviewed: '1/24/2025',
  leaveManager: 'Daniel Sullivan',
  employeeName: 'Margaret Kittrell',
  leaveId: '575339145807',
  prelimEmailDate: '1/21/2025',
  autoFillNoIssue: true,
  reviewStatus: 'Submitted',
  outcome: 'No Issue',
  openFindings: 0
},
{
  id: 'MR-1042',
  lob: 'FML',
  quarter: '1Q25',
  policyNumber: 'FML0985406',
  groupName: 'BayCare Health System',
  auditorInitials: 'DR',
  dateReviewed: '1/24/2025',
  leaveManager: 'Elizabeth Gee',
  employeeName: 'Moraima Martinez',
  leaveId: '461775436544',
  prelimEmailDate: '1/21/2025',
  autoFillNoIssue: true,
  reviewStatus: 'Submitted',
  outcome: 'No Issue',
  openFindings: 0
},
{
  id: 'MR-1043',
  lob: 'FML',
  quarter: '1Q25',
  policyNumber: 'FML0985354',
  groupName: 'Fluor Marine Propulsion',
  auditorInitials: 'DR',
  dateReviewed: '1/29/2025',
  leaveManager: 'Jesse Hammer',
  employeeName: 'Francis Igoe',
  leaveId: '792113275436',
  prelimEmailDate: '1/27/2025',
  autoFillNoIssue: false,
  reviewStatus: 'In Review',
  outcome: 'Issue',
  openFindings: 2
},
{
  id: 'MR-1044',
  lob: 'FML',
  quarter: '1Q25',
  policyNumber: 'FML0985354',
  groupName: 'Fluor Marine Propulsion',
  auditorInitials: 'DR',
  dateReviewed: '1/29/2025',
  leaveManager: 'Jammie Butler',
  employeeName: 'Jon Moak',
  leaveId: '211725293841',
  prelimEmailDate: '1/27/2025',
  autoFillNoIssue: false,
  reviewStatus: 'Pending',
  outcome: 'Not Started',
  openFindings: 0
},
{
  id: 'MR-1045',
  lob: 'FML',
  quarter: '1Q25',
  policyNumber: 'FML0985354',
  groupName: 'Fluor Marine Propulsion',
  auditorInitials: 'DR',
  dateReviewed: '1/29/2025',
  leaveManager: 'Jammie Butler',
  employeeName: 'Thomas Beach',
  leaveId: '181350756257',
  prelimEmailDate: '1/27/2025',
  autoFillNoIssue: false,
  reviewStatus: 'Pending',
  outcome: 'Not Started',
  openFindings: 0
},
{
  id: 'MR-1046',
  lob: 'FML',
  quarter: '1Q25',
  policyNumber: 'FML0985213',
  groupName: 'Honeywell',
  auditorInitials: 'DR',
  dateReviewed: '2/10/2025',
  leaveManager: 'Daniel Sullivan',
  employeeName: 'Abdulkarim Jamal',
  leaveId: '778265349358',
  prelimEmailDate: '2/6/2025',
  autoFillNoIssue: true,
  reviewStatus: 'Submitted',
  outcome: 'No Issue',
  openFindings: 0
},
{
  id: 'MR-1047',
  lob: 'FML',
  quarter: '1Q25',
  policyNumber: 'FML0985213',
  groupName: 'Honeywell',
  auditorInitials: 'DR',
  dateReviewed: '2/10/2025',
  leaveManager: 'Juston Smith',
  employeeName: 'Alex Ouzounian',
  leaveId: '597147768806',
  prelimEmailDate: '2/6/2025',
  autoFillNoIssue: false,
  reviewStatus: 'In Review',
  outcome: 'Issue',
  openFindings: 1
},
{
  id: 'MR-1048',
  lob: 'STD',
  quarter: '1Q25',
  policyNumber: 'STD0446120',
  groupName: 'Honeywell',
  auditorInitials: 'LM',
  dateReviewed: '2/12/2025',
  leaveManager: 'Elizabeth Gee',
  employeeName: 'John Lively',
  leaveId: '969321827746',
  prelimEmailDate: '2/7/2025',
  autoFillNoIssue: false,
  reviewStatus: 'Pending',
  outcome: 'Not Started',
  openFindings: 0
},
{
  id: 'MR-1049',
  lob: 'LTD',
  quarter: '1Q25',
  policyNumber: 'LTD0771904',
  groupName: 'Sysco Corporation',
  auditorInitials: 'LM',
  dateReviewed: '2/18/2025',
  leaveManager: 'Juston Smith',
  employeeName: 'Bryan Barnes',
  leaveId: '722495061945',
  prelimEmailDate: '2/13/2025',
  autoFillNoIssue: false,
  reviewStatus: 'Pending',
  outcome: 'Not Started',
  openFindings: 0
},
{
  id: 'MR-1050',
  lob: 'FML',
  quarter: '2Q25',
  policyNumber: 'FML0985406',
  groupName: 'BayCare Health System',
  auditorInitials: 'DR',
  dateReviewed: '4/3/2025',
  leaveManager: 'Daniel Sullivan',
  employeeName: 'Timira Radford',
  leaveId: '167066139065',
  prelimEmailDate: '3/31/2025',
  autoFillNoIssue: false,
  reviewStatus: 'Pending',
  outcome: 'Not Started',
  openFindings: 0
}];


export const systemFeeds: SystemFeed[] = [
{
  id: 'feed-lms',
  name: 'Leave Management System',
  description: 'Leave events, decisions and letter mail dates',
  method: 'REST API',
  cadence: 'Every 15 min',
  lastSync: 'Aug 31, 2026 08:42 AM',
  records: '128,450',
  coverage: 98,
  status: 'Connected'
},
{
  id: 'feed-dcm',
  name: 'Document & Mailroom Platform',
  description: 'Eligibility / decision letter generation and postmark dates',
  method: 'SFTP batch',
  cadence: 'Nightly 02:00',
  lastSync: 'Aug 31, 2026 02:04 AM',
  records: '54,102',
  coverage: 92,
  status: 'Connected'
},
{
  id: 'feed-claims',
  name: 'Claims Data Warehouse',
  description: 'Payment accuracy, offsets and benefit calculations',
  method: 'Snowflake view',
  cadence: 'Daily 05:00',
  lastSync: 'Aug 31, 2026 05:12 AM',
  records: '86,730',
  coverage: 95,
  status: 'Connected'
},
{
  id: 'feed-telephony',
  name: 'Contact Center Telephony',
  description: 'Call handling, abandon rate and speed-to-answer',
  method: 'REST API',
  cadence: 'Hourly',
  lastSync: 'Aug 30, 2026 11:05 PM',
  records: '31,908',
  coverage: 74,
  status: 'Degraded'
},
{
  id: 'feed-manual',
  name: 'Manual Quality Reviews',
  description: 'Auditor scored reviews captured in this application',
  method: 'In-app form',
  cadence: 'Continuous',
  lastSync: 'Aug 31, 2026 09:10 AM',
  records: '1,240',
  coverage: 100,
  status: 'Connected'
},
{
  id: 'feed-workbook',
  name: 'Legacy Audit Workbook (Excel)',
  description: 'Historical quarterly audit tabs pending migration',
  method: 'File upload',
  cadence: 'Ad hoc',
  lastSync: 'Aug 12, 2026 03:26 PM',
  records: '9,764',
  coverage: 60,
  status: 'Manual'
}];
