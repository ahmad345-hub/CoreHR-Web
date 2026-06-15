const {
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
  Announcement,
} = require('../models');

async function seed() {
  try {
    // Recreate all tables
    await sequelize.sync({ force: true });
    console.log('Tables recreated successfully.');

    // =========================================================================
    // 1. Company
    // =========================================================================
    const company = await Company.create({
      name: 'TechCorp Palestine',
      address: 'Main Street, Tulkarm',
      city: 'Tulkarm',
      country: 'Palestine',
      phone: '+970-9-267-0000',
      email: 'info@techcorp.ps',
      website: 'https://techcorp.ps',
      industry: 'Technology',
      tax_id: 'PS-TC-2024-001',
    });
    console.log('Company created.');

    // =========================================================================
    // 2. Users (User.create auto-hashes passwords via model hook)
    // =========================================================================
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@techcorp.ps',
      password: 'admin123',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
    });

    const ahmadUser = await User.create({
      username: 'ahmad.khalil',
      email: 'ahmad.khalil@techcorp.ps',
      password: 'admin123',
      first_name: 'Ahmad',
      last_name: 'Khalil',
      role: 'manager',
    });

    const fatimaUser = await User.create({
      username: 'fatima.hassan',
      email: 'fatima.hassan@techcorp.ps',
      password: 'admin123',
      first_name: 'Fatima',
      last_name: 'Hassan',
      role: 'employee',
    });

    const omarUser = await User.create({
      username: 'omar.nasser',
      email: 'omar.nasser@techcorp.ps',
      password: 'admin123',
      first_name: 'Omar',
      last_name: 'Nasser',
      role: 'employee',
    });

    const saraUser = await User.create({
      username: 'sara.ali',
      email: 'sara.ali@techcorp.ps',
      password: 'admin123',
      first_name: 'Sara',
      last_name: 'Ali',
      role: 'manager',
    });

    const khaledUser = await User.create({
      username: 'khaled.mahmoud',
      email: 'khaled.mahmoud@techcorp.ps',
      password: 'admin123',
      first_name: 'Khaled',
      last_name: 'Mahmoud',
      role: 'employee',
    });

    const noorUser = await User.create({
      username: 'noor.ahmad',
      email: 'noor.ahmad@techcorp.ps',
      password: 'admin123',
      first_name: 'Noor',
      last_name: 'Ahmad',
      role: 'employee',
    });

    const yazanUser = await User.create({
      username: 'yazan.suleiman',
      email: 'yazan.suleiman@techcorp.ps',
      password: 'admin123',
      first_name: 'Yazan',
      last_name: 'Suleiman',
      role: 'employee',
    });

    const linaUser = await User.create({
      username: 'lina.barakat',
      email: 'lina.barakat@techcorp.ps',
      password: 'admin123',
      first_name: 'Lina',
      last_name: 'Barakat',
      role: 'employee',
    });

    const ramiUser = await User.create({
      username: 'rami.haddad',
      email: 'rami.haddad@techcorp.ps',
      password: 'admin123',
      first_name: 'Rami',
      last_name: 'Haddad',
      role: 'employee',
    });

    console.log('Users created.');

    // =========================================================================
    // 3. Departments
    // =========================================================================
    const engineering = await Department.create({
      name: 'Engineering',
      company_id: company.id,
      description: 'Software engineering and development',
    });

    const hr = await Department.create({
      name: 'HR',
      company_id: company.id,
      description: 'Human resources and people management',
    });

    const finance = await Department.create({
      name: 'Finance',
      company_id: company.id,
      description: 'Financial management and accounting',
    });

    const marketing = await Department.create({
      name: 'Marketing',
      company_id: company.id,
      description: 'Marketing and brand management',
    });

    const operations = await Department.create({
      name: 'Operations',
      company_id: company.id,
      description: 'Business operations and logistics',
    });

    console.log('Departments created.');

    // =========================================================================
    // 4. Job Positions
    // =========================================================================
    const engManager = await JobPosition.create({
      title: 'Engineering Manager',
      department_id: engineering.id,
      description: 'Leads the engineering team',
    });

    const softwareDev = await JobPosition.create({
      title: 'Software Developer',
      department_id: engineering.id,
      description: 'Develops and maintains software applications',
    });

    const frontendDev = await JobPosition.create({
      title: 'Frontend Developer',
      department_id: engineering.id,
      description: 'Builds user interfaces and frontend features',
    });

    const qaEngineer = await JobPosition.create({
      title: 'QA Engineer',
      department_id: engineering.id,
      description: 'Ensures software quality through testing',
    });

    const hrManager = await JobPosition.create({
      title: 'HR Manager',
      department_id: hr.id,
      description: 'Manages human resources department',
    });

    const hrSpecialist = await JobPosition.create({
      title: 'HR Specialist',
      department_id: hr.id,
      description: 'Handles HR operations and employee relations',
    });

    const accountant = await JobPosition.create({
      title: 'Accountant',
      department_id: finance.id,
      description: 'Manages financial records and reporting',
    });

    const marketingSpecialist = await JobPosition.create({
      title: 'Marketing Specialist',
      department_id: marketing.id,
      description: 'Plans and executes marketing campaigns',
    });

    const opsManager = await JobPosition.create({
      title: 'Operations Manager',
      department_id: operations.id,
      description: 'Oversees daily business operations',
    });

    // Additional positions for recruitment
    const seniorDev = await JobPosition.create({
      title: 'Senior Developer',
      department_id: engineering.id,
      description: 'Senior-level software development',
    });

    const hrCoordinator = await JobPosition.create({
      title: 'HR Coordinator',
      department_id: hr.id,
      description: 'Coordinates HR activities and recruitment',
    });

    console.log('Job Positions created.');

    // =========================================================================
    // 5. Employees
    // =========================================================================
    const empAhmad = await Employee.create({
      user_id: ahmadUser.id,
      badge_id: 'EMP-001',
      first_name: 'Ahmad',
      last_name: 'Khalil',
      email: 'ahmad.khalil@techcorp.ps',
      phone: '+970-59-100-0001',
      gender: 'male',
      date_of_birth: '1985-03-15',
      nationality: 'Palestinian',
      address: 'Nablus Road',
      city: 'Tulkarm',
      country: 'Palestine',
      department_id: engineering.id,
      job_position_id: engManager.id,
      company_id: company.id,
      date_of_joining: '2020-01-15',
      work_type: 'on_site',
      shift: 'Morning',
      basic_salary: 8000,
    });

    const empFatima = await Employee.create({
      user_id: fatimaUser.id,
      badge_id: 'EMP-002',
      first_name: 'Fatima',
      last_name: 'Hassan',
      email: 'fatima.hassan@techcorp.ps',
      phone: '+970-59-100-0002',
      gender: 'female',
      date_of_birth: '1992-07-22',
      nationality: 'Palestinian',
      address: 'Al-Quds Street',
      city: 'Tulkarm',
      country: 'Palestine',
      department_id: engineering.id,
      job_position_id: softwareDev.id,
      company_id: company.id,
      manager_id: empAhmad.id,
      date_of_joining: '2021-06-01',
      work_type: 'hybrid',
      shift: 'Morning',
      basic_salary: 5000,
    });

    const empOmar = await Employee.create({
      user_id: omarUser.id,
      badge_id: 'EMP-003',
      first_name: 'Omar',
      last_name: 'Nasser',
      email: 'omar.nasser@techcorp.ps',
      phone: '+970-59-100-0003',
      gender: 'male',
      date_of_birth: '1994-11-05',
      nationality: 'Palestinian',
      address: 'Palestine Street',
      city: 'Tulkarm',
      country: 'Palestine',
      department_id: engineering.id,
      job_position_id: frontendDev.id,
      company_id: company.id,
      manager_id: empAhmad.id,
      date_of_joining: '2022-02-15',
      work_type: 'remote',
      shift: 'Morning',
      basic_salary: 4500,
    });

    const empSara = await Employee.create({
      user_id: saraUser.id,
      badge_id: 'EMP-004',
      first_name: 'Sara',
      last_name: 'Ali',
      email: 'sara.ali@techcorp.ps',
      phone: '+970-59-100-0004',
      gender: 'female',
      date_of_birth: '1988-01-30',
      nationality: 'Palestinian',
      address: 'Jamal Abdel Nasser St',
      city: 'Tulkarm',
      country: 'Palestine',
      department_id: hr.id,
      job_position_id: hrManager.id,
      company_id: company.id,
      date_of_joining: '2019-08-01',
      work_type: 'on_site',
      shift: 'Morning',
      basic_salary: 7000,
    });

    const empKhaled = await Employee.create({
      user_id: khaledUser.id,
      badge_id: 'EMP-005',
      first_name: 'Khaled',
      last_name: 'Mahmoud',
      email: 'khaled.mahmoud@techcorp.ps',
      phone: '+970-59-100-0005',
      gender: 'male',
      date_of_birth: '1995-09-12',
      nationality: 'Palestinian',
      address: 'Al-Irsal Street',
      city: 'Tulkarm',
      country: 'Palestine',
      department_id: hr.id,
      job_position_id: hrSpecialist.id,
      company_id: company.id,
      manager_id: empSara.id,
      date_of_joining: '2023-01-10',
      work_type: 'on_site',
      shift: 'Morning',
      basic_salary: 4000,
    });

    const empNoor = await Employee.create({
      user_id: noorUser.id,
      badge_id: 'EMP-006',
      first_name: 'Noor',
      last_name: 'Ahmad',
      email: 'noor.ahmad@techcorp.ps',
      phone: '+970-59-100-0006',
      gender: 'female',
      date_of_birth: '1991-04-18',
      nationality: 'Palestinian',
      address: 'Anabta Road',
      city: 'Tulkarm',
      country: 'Palestine',
      department_id: finance.id,
      job_position_id: accountant.id,
      company_id: company.id,
      date_of_joining: '2021-03-01',
      work_type: 'on_site',
      shift: 'Morning',
      basic_salary: 4500,
    });

    const empYazan = await Employee.create({
      user_id: yazanUser.id,
      badge_id: 'EMP-007',
      first_name: 'Yazan',
      last_name: 'Suleiman',
      email: 'yazan.suleiman@techcorp.ps',
      phone: '+970-59-100-0007',
      gender: 'male',
      date_of_birth: '1993-12-25',
      nationality: 'Palestinian',
      address: 'Al-Manshiyya',
      city: 'Tulkarm',
      country: 'Palestine',
      department_id: marketing.id,
      job_position_id: marketingSpecialist.id,
      company_id: company.id,
      date_of_joining: '2022-09-01',
      work_type: 'hybrid',
      shift: 'Morning',
      basic_salary: 4000,
    });

    const empLina = await Employee.create({
      user_id: linaUser.id,
      badge_id: 'EMP-008',
      first_name: 'Lina',
      last_name: 'Barakat',
      email: 'lina.barakat@techcorp.ps',
      phone: '+970-59-100-0008',
      gender: 'female',
      date_of_birth: '1996-06-08',
      nationality: 'Palestinian',
      address: 'Irtah',
      city: 'Tulkarm',
      country: 'Palestine',
      department_id: engineering.id,
      job_position_id: qaEngineer.id,
      company_id: company.id,
      manager_id: empAhmad.id,
      date_of_joining: '2023-04-15',
      work_type: 'on_site',
      shift: 'Morning',
      basic_salary: 4500,
    });

    const empRami = await Employee.create({
      user_id: ramiUser.id,
      badge_id: 'EMP-009',
      first_name: 'Rami',
      last_name: 'Haddad',
      email: 'rami.haddad@techcorp.ps',
      phone: '+970-59-100-0009',
      gender: 'male',
      date_of_birth: '1987-08-20',
      nationality: 'Palestinian',
      address: 'Shuweika',
      city: 'Tulkarm',
      country: 'Palestine',
      department_id: operations.id,
      job_position_id: opsManager.id,
      company_id: company.id,
      date_of_joining: '2020-05-01',
      work_type: 'on_site',
      shift: 'Morning',
      basic_salary: 6000,
    });

    // All employees array (excluding admin who has no employee record)
    const allEmployees = [empAhmad, empFatima, empOmar, empSara, empKhaled, empNoor, empYazan, empLina, empRami];

    // Update department managers
    await engineering.update({ manager_id: empAhmad.id });
    await hr.update({ manager_id: empSara.id });
    await operations.update({ manager_id: empRami.id });

    console.log('Employees created.');

    // =========================================================================
    // 6. Leave Types
    // =========================================================================
    const annualLeave = await LeaveType.create({
      name: 'Annual Leave',
      company_id: company.id,
      max_days: 21,
      is_paid: true,
      carry_forward: true,
      color: '#4CAF50',
    });

    const sickLeave = await LeaveType.create({
      name: 'Sick Leave',
      company_id: company.id,
      max_days: 14,
      is_paid: true,
      carry_forward: false,
      color: '#F44336',
    });

    const personalLeave = await LeaveType.create({
      name: 'Personal Leave',
      company_id: company.id,
      max_days: 5,
      is_paid: true,
      carry_forward: false,
      color: '#2196F3',
    });

    const unpaidLeave = await LeaveType.create({
      name: 'Unpaid Leave',
      company_id: company.id,
      max_days: 30,
      is_paid: false,
      carry_forward: false,
      color: '#9E9E9E',
    });

    const leaveTypes = [annualLeave, sickLeave, personalLeave, unpaidLeave];

    console.log('Leave Types created.');

    // =========================================================================
    // 7. Leave Allocations (for each employee, all leave types, year 2026)
    // =========================================================================
    for (const emp of allEmployees) {
      for (const lt of leaveTypes) {
        await LeaveAllocation.create({
          employee_id: emp.id,
          leave_type_id: lt.id,
          year: 2026,
          allocated_days: lt.max_days,
          used_days: 0,
          remaining_days: lt.max_days,
        });
      }
    }
    console.log('Leave Allocations created.');

    // =========================================================================
    // 8. Holidays
    // =========================================================================
    await Holiday.bulkCreate([
      { name: 'New Year', date: '2026-01-01', company_id: company.id, is_recurring: true },
      { name: 'Labour Day', date: '2026-05-01', company_id: company.id, is_recurring: true },
      { name: 'Eid al-Fitr', date: '2026-03-30', company_id: company.id, is_recurring: false },
      { name: 'Eid al-Adha', date: '2026-06-06', company_id: company.id, is_recurring: false },
      { name: 'Independence Day', date: '2026-11-15', company_id: company.id, is_recurring: true },
    ]);
    console.log('Holidays created.');

    // =========================================================================
    // 9. Attendance (last 7 days for each employee)
    // =========================================================================
    const today = new Date('2026-04-04');
    const statuses = ['present', 'present', 'present', 'present', 'present', 'late', 'absent'];

    for (const emp of allEmployees) {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayOfWeek = date.getDay();

        // Skip weekends (Friday = 5, Saturday = 6 in Palestine)
        if (dayOfWeek === 5 || dayOfWeek === 6) continue;

        // Pick a varied status based on employee and day
        const statusIndex = (emp.id + i) % statuses.length;
        const status = statuses[statusIndex];

        const dateStr = date.toISOString().split('T')[0];

        if (status === 'absent') {
          await Attendance.create({
            employee_id: emp.id,
            date: dateStr,
            status: 'absent',
            notes: 'Employee was absent',
          });
        } else {
          const isLate = status === 'late';
          const checkInHour = isLate ? 9 : 8;
          const checkInMin = isLate ? Math.floor(Math.random() * 30) + 15 : Math.floor(Math.random() * 15);
          const checkIn = new Date(`${dateStr}T${String(checkInHour).padStart(2, '0')}:${String(checkInMin).padStart(2, '0')}:00`);
          const checkOut = new Date(`${dateStr}T17:00:00`);
          const workedHours = ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2);

          await Attendance.create({
            employee_id: emp.id,
            date: dateStr,
            check_in: checkIn,
            check_out: checkOut,
            status,
            worked_hours: workedHours,
            overtime_hours: 0,
          });
        }
      }
    }
    console.log('Attendance records created.');

    // =========================================================================
    // 10. Contracts (one active contract per employee)
    // =========================================================================
    const salaries = {
      [empAhmad.id]: 8000,
      [empFatima.id]: 5000,
      [empOmar.id]: 4500,
      [empSara.id]: 7000,
      [empKhaled.id]: 4000,
      [empNoor.id]: 4500,
      [empYazan.id]: 4000,
      [empLina.id]: 4500,
      [empRami.id]: 6000,
    };

    for (const emp of allEmployees) {
      await Contract.create({
        employee_id: emp.id,
        contract_type: 'full_time',
        start_date: emp.date_of_joining,
        end_date: '2027-12-31',
        salary: salaries[emp.id],
        wage_type: 'monthly',
        status: 'active',
      });
    }
    console.log('Contracts created.');

    // =========================================================================
    // 11. Allowances & Deductions
    // =========================================================================
    await Allowance.bulkCreate([
      { name: 'Transportation', type: 'fixed', amount: 200, is_taxable: false, company_id: company.id },
      { name: 'Housing', type: 'percentage', amount: 15, is_taxable: true, company_id: company.id },
      { name: 'Health Insurance', type: 'fixed', amount: 300, is_taxable: false, company_id: company.id },
    ]);

    await Deduction.bulkCreate([
      { name: 'Tax', type: 'percentage', amount: 10, is_pretax: false, company_id: company.id },
      { name: 'Social Security', type: 'percentage', amount: 7, is_pretax: true, company_id: company.id },
      { name: 'Health Fund', type: 'fixed', amount: 100, is_pretax: true, company_id: company.id },
    ]);

    console.log('Allowances & Deductions created.');

    // =========================================================================
    // 12. Payslips (Jan, Feb, Mar 2026 for each employee)
    // =========================================================================
    for (const emp of allEmployees) {
      const basic = salaries[emp.id];
      // Allowances: Transportation(200) + Housing(15% of basic) + Health Insurance(300)
      const totalAllowances = 200 + (basic * 0.15) + 300;
      // Deductions: Tax(10% of basic) + Social Security(7% of basic) + Health Fund(100)
      const totalDeductions = (basic * 0.10) + (basic * 0.07) + 100;
      const netSalary = basic + totalAllowances - totalDeductions;

      for (const month of [1, 2, 3]) {
        await Payslip.create({
          employee_id: emp.id,
          month,
          year: 2026,
          basic_salary: basic,
          total_allowances: totalAllowances,
          total_deductions: totalDeductions,
          net_salary: netSalary,
          status: 'paid',
          paid_date: `2026-${String(month).padStart(2, '0')}-28`,
        });
      }
    }
    console.log('Payslips created.');

    // =========================================================================
    // 13. Recruitment
    // =========================================================================
    const rec1 = await Recruitment.create({
      title: 'Senior Developer',
      department_id: engineering.id,
      job_position_id: seniorDev.id,
      description: 'Looking for an experienced senior developer to lead frontend and backend projects.',
      vacancies: 1,
      status: 'open',
      start_date: '2026-03-01',
      end_date: '2026-05-01',
      company_id: company.id,
    });

    const rec2 = await Recruitment.create({
      title: 'HR Coordinator',
      department_id: hr.id,
      job_position_id: hrCoordinator.id,
      description: 'Seeking an HR coordinator to assist with recruitment and employee onboarding.',
      vacancies: 1,
      status: 'open',
      start_date: '2026-03-15',
      end_date: '2026-05-15',
      company_id: company.id,
    });

    // Stages for recruitment 1
    const stageNames = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];
    const rec1Stages = [];
    for (let i = 0; i < stageNames.length; i++) {
      const stage = await RecruitmentStage.create({
        name: stageNames[i],
        sequence: i + 1,
        recruitment_id: rec1.id,
      });
      rec1Stages.push(stage);
    }

    // Stages for recruitment 2
    const rec2Stages = [];
    for (let i = 0; i < stageNames.length; i++) {
      const stage = await RecruitmentStage.create({
        name: stageNames[i],
        sequence: i + 1,
        recruitment_id: rec2.id,
      });
      rec2Stages.push(stage);
    }

    // Candidates for Senior Developer (3 candidates at different stages)
    await Candidate.create({
      name: 'Mahmoud Issa',
      email: 'mahmoud.issa@gmail.com',
      phone: '+970-59-200-0001',
      recruitment_id: rec1.id,
      stage_id: rec1Stages[2].id, // Interview
      rating: 4,
      notes: 'Strong backend skills, 6 years experience.',
      status: 'interviewed',
    });

    await Candidate.create({
      name: 'Dana Khatib',
      email: 'dana.khatib@gmail.com',
      phone: '+970-59-200-0002',
      recruitment_id: rec1.id,
      stage_id: rec1Stages[3].id, // Offer
      rating: 5,
      notes: 'Excellent full-stack developer. Top candidate.',
      status: 'offered',
    });

    await Candidate.create({
      name: 'Tariq Awad',
      email: 'tariq.awad@gmail.com',
      phone: '+970-59-200-0003',
      recruitment_id: rec1.id,
      stage_id: rec1Stages[0].id, // Applied
      rating: 2,
      notes: 'Junior level, needs more experience.',
      status: 'applied',
    });

    // Candidates for HR Coordinator (2 candidates)
    await Candidate.create({
      name: 'Hala Mansour',
      email: 'hala.mansour@gmail.com',
      phone: '+970-59-200-0004',
      recruitment_id: rec2.id,
      stage_id: rec2Stages[1].id, // Screening
      rating: 3,
      notes: 'Good communication skills, HR background.',
      status: 'shortlisted',
    });

    await Candidate.create({
      name: 'Sami Jabar',
      email: 'sami.jabar@gmail.com',
      phone: '+970-59-200-0005',
      recruitment_id: rec2.id,
      stage_id: rec2Stages[2].id, // Interview
      rating: 4,
      notes: '3 years HR experience, strong references.',
      status: 'interviewed',
    });

    console.log('Recruitment created.');

    // =========================================================================
    // 14. Announcements
    // =========================================================================
    await Announcement.create({
      title: 'Welcome to 2026!',
      body: 'Happy New Year to all TechCorp Palestine employees! Wishing you a productive and successful year ahead. Let us continue to build great things together.',
      company_id: company.id,
      expire_date: '2026-01-31',
      is_active: true,
    });

    await Announcement.create({
      title: 'Q1 Performance Review',
      body: 'Q1 Performance Review starts next week. Please prepare your self-assessments and schedule meetings with your managers by April 10th.',
      company_id: company.id,
      expire_date: '2026-04-30',
      is_active: true,
    });

    console.log('Announcements created.');

    // =========================================================================
    // 15. Onboarding Stages
    // =========================================================================
    const onb1 = await OnboardingStage.create({
      name: 'Documentation',
      sequence: 1,
      company_id: company.id,
    });

    const onb2 = await OnboardingStage.create({
      name: 'IT Setup',
      sequence: 2,
      company_id: company.id,
    });

    const onb3 = await OnboardingStage.create({
      name: 'Training',
      sequence: 3,
      company_id: company.id,
    });

    const onb4 = await OnboardingStage.create({
      name: 'Department Introduction',
      sequence: 4,
      company_id: company.id,
    });

    console.log('Onboarding Stages created.');

    // =========================================================================
    // 15b. Onboarding Task Templates (no employee assigned)
    // =========================================================================
    await OnboardingTask.create({
      title: 'Submit personal documents',
      description: 'Provide ID, tax forms, and emergency contacts',
      stage_id: onb1.id,
      is_required: true,
    });
    await OnboardingTask.create({
      title: 'Setup email and accounts',
      description: 'IT will configure email, Slack, and Git access',
      stage_id: onb2.id,
      is_required: true,
    });
    await OnboardingTask.create({
      title: 'Complete security training',
      description: 'Complete the online security awareness training module',
      stage_id: onb3.id,
      is_required: true,
    });
    await OnboardingTask.create({
      title: 'Meet the team',
      description: 'Introduction meeting with department members',
      stage_id: onb4.id,
      is_required: false,
    });

    // Assign onboarding to Lina (newest employee)
    await OnboardingTask.create({
      title: 'Submit personal documents',
      description: 'Provide ID, tax forms, and emergency contacts',
      stage_id: onb1.id,
      employee_id: empLina.id,
      is_required: true,
      status: 'completed',
      completed_at: '2023-04-16',
    });
    await OnboardingTask.create({
      title: 'Setup email and accounts',
      description: 'IT will configure email, Slack, and Git access',
      stage_id: onb2.id,
      employee_id: empLina.id,
      is_required: true,
      status: 'completed',
      completed_at: '2023-04-17',
    });
    await OnboardingTask.create({
      title: 'Complete security training',
      description: 'Complete the online security awareness training module',
      stage_id: onb3.id,
      employee_id: empLina.id,
      is_required: true,
      status: 'pending',
    });
    await OnboardingTask.create({
      title: 'Meet the team',
      description: 'Introduction meeting with department members',
      stage_id: onb4.id,
      employee_id: empLina.id,
      is_required: false,
      status: 'pending',
    });

    console.log('Onboarding Tasks created.');

    // =========================================================================
    // 15c. Offboarding Stages
    // =========================================================================
    const offStage1 = await OffboardingStage.create({
      name: 'Knowledge Transfer',
      sequence: 1,
      company_id: company.id,
    });
    const offStage2 = await OffboardingStage.create({
      name: 'Return Assets',
      sequence: 2,
      company_id: company.id,
    });
    const offStage3 = await OffboardingStage.create({
      name: 'Exit Interview',
      sequence: 3,
      company_id: company.id,
    });
    const offStage4 = await OffboardingStage.create({
      name: 'Final Clearance',
      sequence: 4,
      company_id: company.id,
    });

    console.log('Offboarding Stages created.');

    // =========================================================================
    // 15d. Leave Requests (some sample requests)
    // =========================================================================
    await LeaveRequest.create({
      employee_id: empFatima.id,
      leave_type_id: annualLeave.id,
      start_date: '2026-04-10',
      end_date: '2026-04-12',
      days: 3,
      reason: 'Family event in Nablus',
      status: 'pending',
    });

    await LeaveRequest.create({
      employee_id: empOmar.id,
      leave_type_id: sickLeave.id,
      start_date: '2026-03-25',
      end_date: '2026-03-26',
      days: 2,
      reason: 'Flu',
      status: 'approved',
      approved_by: adminUser.id,
    });

    await LeaveRequest.create({
      employee_id: empYazan.id,
      leave_type_id: personalLeave.id,
      start_date: '2026-04-05',
      end_date: '2026-04-05',
      days: 1,
      reason: 'Personal appointment',
      status: 'approved',
      approved_by: adminUser.id,
    });

    console.log('Leave Requests created.');

    // =========================================================================
    // 15e. Feedback
    // =========================================================================
    await Feedback.create({
      from_employee_id: empAhmad.id,
      to_employee_id: empFatima.id,
      rating: 5,
      comment: 'Excellent work on the API migration. Very thorough and well-tested code.',
      period: 'performance',
    });

    await Feedback.create({
      from_employee_id: empSara.id,
      to_employee_id: empKhaled.id,
      rating: 4,
      comment: 'Great progress in recruitment coordination. Keep improving communication skills.',
      period: 'manager',
    });

    await Feedback.create({
      from_employee_id: empFatima.id,
      to_employee_id: empOmar.id,
      rating: 4,
      comment: 'Good collaboration on the frontend components. Responsive and helpful.',
      period: 'peer',
    });

    console.log('Feedback created.');

    // =========================================================================
    // 16. Performance Goals
    // =========================================================================
    await PerformanceGoal.create({
      employee_id: empFatima.id,
      title: 'Complete API migration to v2',
      description: 'Migrate all existing REST endpoints to the new v2 architecture with improved error handling.',
      target_date: '2026-06-30',
      progress: 40,
      status: 'active',
    });

    await PerformanceGoal.create({
      employee_id: empOmar.id,
      title: 'Redesign dashboard UI',
      description: 'Implement the new dashboard design with responsive layouts and improved data visualization.',
      target_date: '2026-05-15',
      progress: 65,
      status: 'active',
    });

    await PerformanceGoal.create({
      employee_id: empLina.id,
      title: 'Achieve 90% automated test coverage',
      description: 'Write automated tests to bring the overall test coverage to at least 90% across all modules.',
      target_date: '2026-07-31',
      progress: 25,
      status: 'active',
    });

    console.log('Performance Goals created.');

    // =========================================================================
    // 17. Helpdesk Tickets
    // =========================================================================
    await HelpdeskTicket.create({
      title: 'Laptop not connecting to Wi-Fi',
      description: 'My laptop has been unable to connect to the office Wi-Fi since this morning. I have tried restarting.',
      category: 'IT',
      priority: 'high',
      status: 'open',
      employee_id: empOmar.id,
      assigned_to: empRami.id,
    });

    await HelpdeskTicket.create({
      title: 'Request for ergonomic chair',
      description: 'I would like to request an ergonomic chair as the current one is causing back pain.',
      category: 'HR',
      priority: 'medium',
      status: 'in_progress',
      employee_id: empYazan.id,
      assigned_to: empKhaled.id,
    });

    await HelpdeskTicket.create({
      title: 'VPN access not working from home',
      description: 'Unable to access the company VPN from my home network. Getting a timeout error.',
      category: 'IT',
      priority: 'high',
      status: 'open',
      employee_id: empFatima.id,
      assigned_to: empRami.id,
    });

    console.log('Helpdesk Tickets created.');

    // =========================================================================
    // 18. Assets
    // =========================================================================
    const laptop1 = await Asset.create({
      name: 'Dell Latitude 5540',
      category: 'Laptop',
      serial_number: 'DL-5540-001',
      purchase_date: '2021-05-15',
      purchase_cost: 1200,
      status: 'allocated',
      company_id: company.id,
    });

    const laptop2 = await Asset.create({
      name: 'Dell Latitude 5540',
      category: 'Laptop',
      serial_number: 'DL-5540-002',
      purchase_date: '2022-01-20',
      purchase_cost: 1200,
      status: 'allocated',
      company_id: company.id,
    });

    const monitor1 = await Asset.create({
      name: 'LG UltraWide 34"',
      category: 'Monitor',
      serial_number: 'LG-UW34-001',
      purchase_date: '2020-01-10',
      purchase_cost: 650,
      status: 'allocated',
      company_id: company.id,
    });

    const phone1 = await Asset.create({
      name: 'iPhone 15 Pro',
      category: 'Phone',
      serial_number: 'IP15P-001',
      purchase_date: '2025-09-25',
      purchase_cost: 1100,
      status: 'available',
      company_id: company.id,
    });

    const laptop3 = await Asset.create({
      name: 'MacBook Pro 14"',
      category: 'Laptop',
      serial_number: 'MBP14-001',
      purchase_date: '2025-11-01',
      purchase_cost: 2400,
      status: 'available',
      company_id: company.id,
    });

    // Asset Allocations
    await AssetAllocation.create({
      asset_id: laptop1.id,
      employee_id: empFatima.id,
      allocated_date: '2021-06-01',
      status: 'active',
    });

    await AssetAllocation.create({
      asset_id: laptop2.id,
      employee_id: empOmar.id,
      allocated_date: '2022-02-15',
      status: 'active',
    });

    await AssetAllocation.create({
      asset_id: monitor1.id,
      employee_id: empAhmad.id,
      allocated_date: '2020-01-15',
      status: 'active',
    });

    console.log('Assets created.');

    // =========================================================================
    // 19. Projects & Tasks
    // =========================================================================
    const project1 = await Project.create({
      name: 'CoreHR Platform',
      description: 'Internal HR management platform for employee self-service, attendance, payroll, and recruitment.',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'active',
      manager_id: empAhmad.id,
      company_id: company.id,
    });

    const project2 = await Project.create({
      name: 'Company Website Redesign',
      description: 'Redesign the company public website with modern UI/UX and improved performance.',
      start_date: '2026-03-01',
      end_date: '2026-06-30',
      status: 'active',
      manager_id: empAhmad.id,
      company_id: company.id,
    });

    // Tasks for CoreHR Platform
    await ProjectTask.create({
      project_id: project1.id,
      title: 'Implement attendance module',
      description: 'Build check-in/check-out, reports, and overtime tracking.',
      assigned_to: empFatima.id,
      status: 'done',
      priority: 'high',
      due_date: '2026-02-28',
    });

    await ProjectTask.create({
      project_id: project1.id,
      title: 'Build payroll dashboard',
      description: 'Create payroll summary dashboard with charts and export functionality.',
      assigned_to: empOmar.id,
      status: 'in_progress',
      priority: 'high',
      due_date: '2026-04-30',
    });

    await ProjectTask.create({
      project_id: project1.id,
      title: 'QA testing for leave module',
      description: 'Write and execute test cases for the leave request and approval workflow.',
      assigned_to: empLina.id,
      status: 'in_progress',
      priority: 'medium',
      due_date: '2026-04-15',
    });

    // Tasks for Website Redesign
    await ProjectTask.create({
      project_id: project2.id,
      title: 'Design new landing page',
      description: 'Create mockups and finalize the design for the new homepage.',
      assigned_to: empOmar.id,
      status: 'done',
      priority: 'high',
      due_date: '2026-03-31',
    });

    await ProjectTask.create({
      project_id: project2.id,
      title: 'Implement responsive navigation',
      description: 'Build the responsive navigation bar with mobile menu support.',
      assigned_to: empFatima.id,
      status: 'todo',
      priority: 'medium',
      due_date: '2026-05-15',
    });

    console.log('Projects & Tasks created.');

    // =========================================================================
    // 20. Notifications (for admin user)
    // =========================================================================
    await Notification.create({
      user_id: adminUser.id,
      title: 'New Leave Request',
      body: 'Fatima Hassan has submitted a leave request for April 10-12, 2026.',
      type: 'leave',
      is_read: false,
    });

    await Notification.create({
      user_id: adminUser.id,
      title: 'Payroll Processed',
      body: 'March 2026 payroll has been processed and all payslips are marked as paid.',
      type: 'payroll',
      is_read: true,
    });

    await Notification.create({
      user_id: adminUser.id,
      title: 'New Candidate Applied',
      body: 'Tariq Awad has applied for the Senior Developer position.',
      type: 'recruitment',
      is_read: false,
    });

    console.log('Notifications created.');

    // =========================================================================
    console.log('\nSeed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
