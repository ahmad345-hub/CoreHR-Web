const sequelize = require('../config/database');

// Import all models
const User = require('./User');
const Company = require('./Company');
const Department = require('./Department');
const JobPosition = require('./JobPosition');
const Employee = require('./Employee');
const Attendance = require('./Attendance');
const LeaveType = require('./LeaveType');
const LeaveAllocation = require('./LeaveAllocation');
const LeaveRequest = require('./LeaveRequest');
const Holiday = require('./Holiday');
const Contract = require('./Contract');
const Allowance = require('./Allowance');
const Deduction = require('./Deduction');
const Payslip = require('./Payslip');
const Recruitment = require('./Recruitment');
const RecruitmentStage = require('./RecruitmentStage');
const Candidate = require('./Candidate');
const OnboardingStage = require('./OnboardingStage');
const OnboardingTask = require('./OnboardingTask');
const OffboardingStage = require('./OffboardingStage');
const OffboardingRecord = require('./OffboardingRecord');
const PerformanceGoal = require('./PerformanceGoal');
const Feedback = require('./Feedback');
const HelpdeskTicket = require('./HelpdeskTicket');
const Asset = require('./Asset');
const AssetAllocation = require('./AssetAllocation');
const Project = require('./Project');
const ProjectTask = require('./ProjectTask');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');
const Announcement = require('./Announcement');
const UserPermission = require('./UserPermission');

// =====================
// ASSOCIATIONS
// =====================

// --- User ---
User.hasOne(Employee, { foreignKey: 'user_id', as: 'employee' });
User.hasOne(UserPermission, { foreignKey: 'user_id', as: 'userPermissions' });
UserPermission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
User.hasMany(LeaveRequest, { foreignKey: 'approved_by', as: 'approvedLeaves' });

// --- Company ---
Company.hasMany(Department, { foreignKey: 'company_id', as: 'departments' });
Company.hasMany(Employee, { foreignKey: 'company_id', as: 'employees' });
Company.hasMany(LeaveType, { foreignKey: 'company_id', as: 'leaveTypes' });
Company.hasMany(Holiday, { foreignKey: 'company_id', as: 'holidays' });
Company.hasMany(Allowance, { foreignKey: 'company_id', as: 'allowances' });
Company.hasMany(Deduction, { foreignKey: 'company_id', as: 'deductions' });
Company.hasMany(Recruitment, { foreignKey: 'company_id', as: 'recruitments' });
Company.hasMany(OnboardingStage, { foreignKey: 'company_id', as: 'onboardingStages' });
Company.hasMany(OffboardingStage, { foreignKey: 'company_id', as: 'offboardingStages' });
Company.hasMany(Asset, { foreignKey: 'company_id', as: 'assets' });
Company.hasMany(Project, { foreignKey: 'company_id', as: 'projects' });
Company.hasMany(Announcement, { foreignKey: 'company_id', as: 'announcements' });

// --- Department ---
Department.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Department.belongsTo(Employee, { foreignKey: 'manager_id', as: 'manager' });
Department.hasMany(Employee, { foreignKey: 'department_id', as: 'employees' });
Department.hasMany(JobPosition, { foreignKey: 'department_id', as: 'jobPositions' });
Department.hasMany(Recruitment, { foreignKey: 'department_id', as: 'recruitments' });

// --- JobPosition ---
JobPosition.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
JobPosition.hasMany(Employee, { foreignKey: 'job_position_id', as: 'employees' });
JobPosition.hasMany(Recruitment, { foreignKey: 'job_position_id', as: 'recruitments' });

// --- Employee ---
Employee.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Employee.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Employee.belongsTo(JobPosition, { foreignKey: 'job_position_id', as: 'jobPosition' });
Employee.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Employee.belongsTo(Employee, { foreignKey: 'manager_id', as: 'manager' });
Employee.hasMany(Employee, { foreignKey: 'manager_id', as: 'subordinates' });

Employee.hasMany(Attendance, { foreignKey: 'employee_id', as: 'attendances' });
Employee.hasMany(LeaveAllocation, { foreignKey: 'employee_id', as: 'leaveAllocations' });
Employee.hasMany(LeaveRequest, { foreignKey: 'employee_id', as: 'leaveRequests' });
Employee.hasMany(Contract, { foreignKey: 'employee_id', as: 'contracts' });
Employee.hasMany(Payslip, { foreignKey: 'employee_id', as: 'payslips' });
Employee.hasMany(OnboardingTask, { foreignKey: 'employee_id', as: 'onboardingTasks' });
Employee.hasMany(OffboardingRecord, { foreignKey: 'employee_id', as: 'offboardingRecords' });
Employee.hasMany(PerformanceGoal, { foreignKey: 'employee_id', as: 'performanceGoals' });
Employee.hasMany(Feedback, { foreignKey: 'from_employee_id', as: 'givenFeedback' });
Employee.hasMany(Feedback, { foreignKey: 'to_employee_id', as: 'receivedFeedback' });
Employee.hasMany(HelpdeskTicket, { foreignKey: 'employee_id', as: 'helpdeskTickets' });
Employee.hasMany(HelpdeskTicket, { foreignKey: 'assigned_to', as: 'assignedTickets' });
Employee.hasMany(AssetAllocation, { foreignKey: 'employee_id', as: 'assetAllocations' });
Employee.hasMany(ProjectTask, { foreignKey: 'assigned_to', as: 'projectTasks' });

// Department manager (reverse)
Employee.hasMany(Department, { foreignKey: 'manager_id', as: 'managedDepartments' });

// Project manager
Employee.hasMany(Project, { foreignKey: 'manager_id', as: 'managedProjects' });

// --- Attendance ---
Attendance.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// --- LeaveType ---
LeaveType.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
LeaveType.hasMany(LeaveAllocation, { foreignKey: 'leave_type_id', as: 'allocations' });
LeaveType.hasMany(LeaveRequest, { foreignKey: 'leave_type_id', as: 'requests' });

// --- LeaveAllocation ---
LeaveAllocation.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
LeaveAllocation.belongsTo(LeaveType, { foreignKey: 'leave_type_id', as: 'leaveType' });

// --- LeaveRequest ---
LeaveRequest.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leave_type_id', as: 'leaveType' });
LeaveRequest.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// --- Holiday ---
Holiday.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// --- Contract ---
Contract.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// --- Allowance ---
Allowance.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// --- Deduction ---
Deduction.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// --- Payslip ---
Payslip.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// --- Recruitment ---
Recruitment.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Recruitment.belongsTo(JobPosition, { foreignKey: 'job_position_id', as: 'jobPosition' });
Recruitment.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Recruitment.hasMany(RecruitmentStage, { foreignKey: 'recruitment_id', as: 'stages' });
Recruitment.hasMany(Candidate, { foreignKey: 'recruitment_id', as: 'candidates' });

// --- RecruitmentStage ---
RecruitmentStage.belongsTo(Recruitment, { foreignKey: 'recruitment_id', as: 'recruitment' });
RecruitmentStage.hasMany(Candidate, { foreignKey: 'stage_id', as: 'candidates' });

// --- Candidate ---
Candidate.belongsTo(Recruitment, { foreignKey: 'recruitment_id', as: 'recruitment' });
Candidate.belongsTo(RecruitmentStage, { foreignKey: 'stage_id', as: 'stage' });

// --- OnboardingStage ---
OnboardingStage.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
OnboardingStage.hasMany(OnboardingTask, { foreignKey: 'stage_id', as: 'tasks' });

// --- OnboardingTask ---
OnboardingTask.belongsTo(OnboardingStage, { foreignKey: 'stage_id', as: 'stage' });
OnboardingTask.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// --- OffboardingStage ---
OffboardingStage.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
OffboardingStage.hasMany(OffboardingRecord, { foreignKey: 'stage_id', as: 'records' });

// --- OffboardingRecord ---
OffboardingRecord.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
OffboardingRecord.belongsTo(OffboardingStage, { foreignKey: 'stage_id', as: 'stage' });

// --- PerformanceGoal ---
PerformanceGoal.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// --- Feedback ---
Feedback.belongsTo(Employee, { foreignKey: 'from_employee_id', as: 'fromEmployee' });
Feedback.belongsTo(Employee, { foreignKey: 'to_employee_id', as: 'toEmployee' });

// --- HelpdeskTicket ---
HelpdeskTicket.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
HelpdeskTicket.belongsTo(Employee, { foreignKey: 'assigned_to', as: 'assignee' });

// --- Asset ---
Asset.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Asset.hasMany(AssetAllocation, { foreignKey: 'asset_id', as: 'allocations' });

// --- AssetAllocation ---
AssetAllocation.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
AssetAllocation.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// --- Project ---
Project.belongsTo(Employee, { foreignKey: 'manager_id', as: 'manager' });
Project.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Project.hasMany(ProjectTask, { foreignKey: 'project_id', as: 'tasks' });

// --- ProjectTask ---
ProjectTask.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
ProjectTask.belongsTo(Employee, { foreignKey: 'assigned_to', as: 'assignee' });

// --- Notification ---
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// --- AuditLog ---
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// --- Announcement ---
Announcement.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

module.exports = {
  sequelize,
  User,
  Company,
  Department,
  JobPosition,
  Employee,
  Attendance,
  LeaveType,
  LeaveAllocation,
  LeaveRequest,
  Holiday,
  Contract,
  Allowance,
  Deduction,
  Payslip,
  Recruitment,
  RecruitmentStage,
  Candidate,
  OnboardingStage,
  OnboardingTask,
  OffboardingStage,
  OffboardingRecord,
  PerformanceGoal,
  Feedback,
  HelpdeskTicket,
  Asset,
  AssetAllocation,
  Project,
  ProjectTask,
  Notification,
  AuditLog,
  Announcement,
  UserPermission,
};
