import { ICourse } from '../models/ICourse';

/**
 * Sample data transcribed from the Excel export (ExcelFile_export_*.xlsx) and the
 * November 2026 calendar view. Long text cells were only partly visible, so replace
 * this with the real list (or import the real Excel via the provisioning script).
 */
const SABA: string = 'https://sabacloud.deloitteresources.com/Saba/Web_spf/E103PRD0001/common/leclassview/';
const EDCAST: string = 'https://becurious.edcast.eu/';

const AGILE_AWARENESS_ABOUT: string =
  'This course will help you understand the Agile mindset and the benefits in adopting Agile mindset in ' +
  'Internal Audit (IA). This training differentiates traditional and Agile IA approaches.';
const AGILE_AWARENESS_OBJECTIVES: string =
  '• Recognize core Agile IA concepts. • Employ Agile IA on their engagements. • Identify SMEs to discuss ' +
  'the application of the methodology in greater detail (e.g., crafting user stories).';

const CLOUD_FUNDAMENTALS_ABOUT: string =
  'This course will introduce basic cloud computing concepts, discuss cloud service, deployment, and ' +
  'shared responsibility models, and outline the key risks and controls to consider when auditing cloud environments.';
const CLOUD_FUNDAMENTALS_OBJECTIVES: string =
  '• Identify the different types of cloud services and deployment models. • Identify key risks and controls ' +
  'based on the shared responsibility model. • Design an audit work program tailored to the cloud environment.';

export const LOCAL_COURSES: ICourse[] = [
  {
    id: '1',
    title: 'Agile Internal Audit Awareness – Virtual (US CPE)',
    startDate: '2026-01-22',
    endDate: '2026-01-22',
    startTime: '01:00 PM',
    endTime: '02:15 PM',
    timeZone: 'ET',
    cpeCredits: 1,
    duration: 1,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: `${SABA}virtc-0007947135`,
    aboutCourse: AGILE_AWARENESS_ABOUT,
    objectives: AGILE_AWARENESS_OBJECTIVES,
    recordedLink: `${EDCAST}journey/agile-internal-audit-awareness-virtual`,
    offering: 'Internal Audit and Controls',
    region: 'US'
  },
  {
    id: '2',
    title: 'Critical Thinking for Internal Auditors - Virtual (US CPE)',
    startDate: '2026-02-18',
    endDate: '2026-02-19',
    startTime: '11:00 AM',
    endTime: '02:00 PM',
    timeZone: 'ET',
    cpeCredits: 5.5,
    duration: 5,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: `${SABA}virtc-0007936322`,
    aboutCourse:
      "The goal of this course is to further develop or refresh practitioners' skills around professional " +
      'skepticism, professional judgment, and critical thinking, and to apply them throughout the internal audit engagement.',
    objectives:
      '• Define the key concepts of professional skepticism, professional judgment, and critical thinking. ' +
      '• Recognize the critical thinking process applied to an internal audit (IA) on your engagement. ' +
      '• Apply the key critical thinking skills, attitudes, and behaviors needed to conduct successful internal audits.',
    recordedLink: `${EDCAST}journey/critical-thinking-for-internal-auditors-virtual-the`,
    offering: 'Internal Audit and Controls',
    region: 'US'
  },
  {
    id: '3',
    title: 'Agile Internal Audit - Bootcamp',
    startDate: '2026-02-23',
    endDate: '2026-02-24',
    startTime: '11:00 AM',
    endTime: '01:00 PM',
    timeZone: 'IST',
    cpeCredits: 4.5,
    duration: 4,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: `${SABA}virtc-0009424059`,
    aboutCourse:
      'The course is designed to give professionals an Overview of the concepts of Agile, its application and ' +
      'project phases to accelerate the new Agile IA implementation.',
    objectives:
      '• Define Agile concepts and principles, develop an Overview of Agile Events and develop an Agile Leadership Mindset.',
    recordedLink: '',
    offering: 'Internal Audit and Controls',
    region: 'USI'
  },
  {
    id: '4',
    title: 'SAP 101 Overview USI',
    startDate: '2026-02-23',
    endDate: '2026-02-23',
    startTime: '10:30 AM',
    endTime: '04:30 PM',
    timeZone: 'IST',
    cpeCredits: 5,
    duration: 6,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: `${SABA}virtc-0009508684`,
    aboutCourse:
      'The SAP 101 Overview course is designed to introduce participants to the concepts on SAP audit approach, ' +
      'how to navigate the SAP ERP sandbox, and how to use the Deloitte ACTT tool in SAP. This course will give an ' +
      'overview of SAP authorization concepts and the SAP auditing approach.',
    objectives:
      '• Evaluate IT risks for SAP. • Utilize the ACTT tool to assist in testing an SAP system. • Recall the basics ' +
      'of SAP Navigation. • Recognize elements of the SAP Auditing approach. • Describe SAP authorization concepts.',
    recordedLink: `${EDCAST}journey/ECL-0b94dea2-7f07-4b48-92f4-c01913b2d8b6`,
    offering: 'Specialized Assurance and Controls',
    region: 'USI'
  },
  {
    id: '5',
    title: 'Auditing AWS - Foundations - Virtual',
    startDate: '2026-03-02',
    endDate: '2026-03-02',
    startTime: '02:00 PM',
    endTime: '05:00 PM',
    timeZone: 'IST',
    cpeCredits: 4,
    duration: 4,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: `${SABA}virtc-0009330936`,
    aboutCourse: 'This course will provide participants with foundational understanding required for auditing AWS Cloud.',
    objectives:
      '• Recall foundational elements of AWS platform. • Identify key control areas and audit considerations for AWS.',
    recordedLink: `${EDCAST}journey/auditing-cloud-foundational-aws`,
    offering: 'Specialized Assurance and Controls',
    region: 'USI'
  },
  {
    id: '6',
    title: 'Fundamentals of Auditing Cloud Computing - Virtual',
    startDate: '2026-03-02',
    endDate: '2026-03-02',
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    timeZone: 'IST',
    cpeCredits: 3,
    duration: 3,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: `${SABA}virtc-0009321230`,
    aboutCourse: CLOUD_FUNDAMENTALS_ABOUT,
    objectives: CLOUD_FUNDAMENTALS_OBJECTIVES,
    recordedLink: `${EDCAST}journey/auditing-cloud-foundational-computing`,
    offering: 'Specialized Assurance and Controls',
    region: 'USI'
  },
  {
    id: '7',
    title: 'Auditing Azure - Foundations - Virtual',
    startDate: '2026-03-09',
    endDate: '2026-03-09',
    startTime: '09:30 AM',
    endTime: '01:30 PM',
    timeZone: 'IST',
    cpeCredits: 4,
    duration: 4,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: `${SABA}virtc-0009331407`,
    aboutCourse: 'This course will provide participants with foundational understanding required for auditing Azure cloud.',
    objectives:
      '• Recall foundational elements of Microsoft Azure platform. • Identify key control areas and audit ' +
      'consideration for Microsoft Azure platform.',
    recordedLink: `${EDCAST}journey/auditing-cloud-foundational-azure`,
    offering: 'Specialized Assurance and Controls',
    region: 'USI'
  },
  {
    id: '8',
    title: 'Auditing Google Cloud Platform (GCP) - Foundations - Virtual',
    startDate: '2026-03-09',
    endDate: '2026-03-09',
    startTime: '02:30 PM',
    endTime: '05:30 PM',
    timeZone: 'IST',
    cpeCredits: 3,
    duration: 3,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: `${SABA}virtc-0009330959`,
    aboutCourse: 'This course will provide participants with foundational understanding required for auditing Google Cloud.',
    objectives:
      '• Recall foundational elements of GCP platform. • Identify key control areas and audit consideration for GCP platform.',
    recordedLink: `${EDCAST}journey/auditing-cloud-foundational-gcp`,
    offering: 'Specialized Assurance and Controls',
    region: 'USI'
  },
  {
    id: '9',
    title: 'Agile Internal Audit Awareness – Virtual (US CPE)',
    startDate: '2026-03-10',
    endDate: '2026-03-10',
    startTime: '09:30 AM',
    endTime: '10:45 AM',
    timeZone: 'ET',
    cpeCredits: 1,
    duration: 1,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: `${SABA}virtc-0007947141`,
    aboutCourse: AGILE_AWARENESS_ABOUT,
    objectives: AGILE_AWARENESS_OBJECTIVES,
    recordedLink: `${EDCAST}journey/agile-internal-audit-awareness-virtual`,
    offering: 'Internal Audit and Controls',
    region: 'US, USI'
  },
  {
    id: '10',
    title: 'Agile Scrum Master',
    startDate: '2026-03-23',
    endDate: '2026-03-24',
    startTime: '11:00 AM',
    endTime: '01:00 PM',
    timeZone: 'IST',
    cpeCredits: 4.5,
    duration: 4,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: `${SABA}virtc-0009634513`,
    aboutCourse:
      'The course is designed to give professionals an understanding of roles and responsibility of a Scrum ' +
      'Master within an Agile internal audit team.',
    objectives:
      '• Define roles and responsibilities of a Scrum Master, develop an understanding of Agile Events and develop ' +
      'an Agile Leadership Mindset.',
    recordedLink: '',
    offering: 'Internal Audit and Controls',
    region: 'USI'
  },
  {
    id: '11',
    title: 'ITIA - Cyber Security Basics - Virtual (US CPE)',
    startDate: '2026-03-25',
    endDate: '2026-03-26',
    startTime: '12:00 PM',
    endTime: '03:00 PM',
    timeZone: 'ET',
    cpeCredits: 6,
    duration: 6,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: `${SABA}virtc-0007985663`,
    aboutCourse:
      "This course will provide practitioners with a foundational understanding of key components of a cyber " +
      "program, Deloitte's Cyber Security Framework and other common cyber assessment frameworks.",
    objectives:
      "• Indicate why cybersecurity is one of our client's top IT risks. • Identify key components and capabilities " +
      "of a cyber program using Deloitte's Cyber Security Framework. • Recognize other cyber assessment frameworks " +
      '(NIST, ISO, and CIS). • Recall cyber risk and maturity assessments. • Examine common cyber audit procedures.',
    recordedLink: `${EDCAST}journey/itia-cyber-security-basics-virtual-itia`,
    offering: 'Internal Audit and Controls',
    region: 'US'
  },
  {
    id: '12',
    title: 'The Fundamentals of ISO 27001 - Virtual',
    startDate: '2026-03-25',
    endDate: '2026-03-26',
    startTime: '11:00 AM',
    endTime: '01:00 PM',
    timeZone: 'ET',
    cpeCredits: 4,
    duration: 4,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: `${SABA}virtc-0009454987`,
    aboutCourse:
      'This program prepares professionals with key knowledge of information security principles, the ' +
      'Confidentiality, Integrity and Availability (CIA) triad, and the steps to establish an Information Security ' +
      'Management System (ISMS) aligned with ISO 27001.',
    objectives:
      '• Define information security and the CIA Triad. • Describe steps to establish an Information Security ' +
      'Management System (ISMS) in line with the ISO 27001 standard. • Recall examples of how risks are identified ' +
      'and evaluated as part of an information risk assessment. • Review ISO 27002 guidance for designing and ' +
      'implementing information security controls. • Discuss how to conduct an ISO 27001 Certification Audit.',
    recordedLink: `${EDCAST}pathways/ECL-813de3fb-6c20-414c-b586-8c9f33419c99`,
    offering: 'Specialized Assurance',
    region: 'US, USI'
  },
  {
    id: '13',
    title: 'Fundamentals of Auditing Cloud Computing - Virtual',
    startDate: '2026-03-31',
    endDate: '2026-03-31',
    startTime: '11:00 AM',
    endTime: '02:00 PM',
    timeZone: 'ET',
    cpeCredits: 3,
    duration: 3,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: '',
    aboutCourse: CLOUD_FUNDAMENTALS_ABOUT,
    objectives: CLOUD_FUNDAMENTALS_OBJECTIVES,
    recordedLink: `${EDCAST}journey/auditing-cloud-foundational-computing`,
    offering: 'Specialized Assurance and Controls',
    region: 'US, USI'
  },
  {
    id: '14',
    title: 'Essentials of Internal Audit - Virtual (US CPE)',
    startDate: '2026-11-11',
    endDate: '2026-11-12',
    startTime: '11:00 AM',
    endTime: '01:00 PM',
    timeZone: 'ET',
    cpeCredits: 4,
    duration: 4,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: '',
    aboutCourse:
      'Essentials of Internal Audit is a foundational course designed to build or refresh on the knowledge and ' +
      'practical skills internal audit professionals need to contribute effectively to high-quality engagements. ' +
      'Aligned with Deloitte IA methodologies and the Global Internal Audit Standards (GIAS), the course introduces ' +
      'the purpose of internal audit, key engagement types, and the end-to-end engagement lifecycle. Learners will ' +
      'explore risk identification, risk and control fundamentals, testing methodologies, and the roles and ' +
      'responsibilities of staff and senior team members. In addition, the course covers IA deliverables, ' +
      'documentation expectations, independence considerations, audit reporting, and the development of clear, ' +
      'quality observations and recommendations. Learners will also be able to appreciate how these concepts come ' +
      'together on a real engagement.',
    objectives: '',
    recordedLink: '',
    offering: 'Internal Audit',
    region: 'US'
  },
  {
    id: '15',
    title: 'Agile Internal Audit Awareness – Virtual (US CPE)',
    startDate: '2026-11-17',
    endDate: '2026-11-17',
    startTime: '01:00 PM',
    endTime: '02:15 PM',
    timeZone: 'ET',
    cpeCredits: 1,
    duration: 1,
    trainingType: 'Virtual',
    deliveryType: 'Virtual Live',
    registrationLink: '',
    aboutCourse: AGILE_AWARENESS_ABOUT,
    objectives: AGILE_AWARENESS_OBJECTIVES,
    recordedLink: `${EDCAST}journey/agile-internal-audit-awareness-virtual`,
    offering: 'Internal Audit and Controls',
    region: 'US'
  }
];
