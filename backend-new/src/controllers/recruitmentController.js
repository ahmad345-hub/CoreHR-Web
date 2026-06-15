const { Op } = require('sequelize');
const { Recruitment, RecruitmentStage, Candidate, Department, JobPosition } = require('../models');

// GET /recruitment/postings - returns all recruitment postings with flattened fields
exports.getPostings = async (req, res) => {
  try {
    const rows = await Recruitment.findAll({
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: JobPosition, as: 'jobPosition', attributes: ['id', 'title'] },
        { model: Candidate, as: 'candidates', attributes: ['id'] },
      ],
      order: [['created_at', 'DESC']],
    });

    // Flatten for frontend
    const results = rows.map(r => {
      const json = r.toJSON();
      return {
        ...json,
        department_name: json.department?.name || '—',
        candidate_count: json.candidates?.length || 0,
      };
    });

    return res.json(results);
  } catch (err) {
    console.error('Recruitment postings error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /recruitment/pipeline - all stages with their candidates grouped
exports.getPipeline = async (req, res) => {
  try {
    const stages = await RecruitmentStage.findAll({
      include: [{
        model: Candidate,
        as: 'candidates',
        include: [
          { model: Recruitment, as: 'recruitment', attributes: ['id', 'title'] },
        ],
      }],
      order: [['sequence', 'ASC']],
    });

    // Flatten candidate data: add posting_title
    const results = stages.map(s => {
      const json = s.toJSON();
      json.candidates = (json.candidates || []).map(c => ({
        ...c,
        posting_title: c.recruitment?.title || '—',
      }));
      return json;
    });

    return res.json(results);
  } catch (err) {
    console.error('Pipeline error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /recruitment/pipeline/:id - single recruitment pipeline
exports.getPipelineById = async (req, res) => {
  try {
    const recruitment = await Recruitment.findByPk(req.params.id, {
      include: [
        { model: Department, as: 'department' },
        {
          model: RecruitmentStage,
          as: 'stages',
          include: [{ model: Candidate, as: 'candidates' }],
          order: [['sequence', 'ASC']],
        },
      ],
    });

    if (!recruitment) {
      return res.status(404).json({ error: 'Recruitment not found.' });
    }

    return res.json(recruitment);
  } catch (err) {
    console.error('Pipeline by id error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.list = async (req, res) => {
  try {
    const rows = await Recruitment.findAll({
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: RecruitmentStage, as: 'stages' },
        { model: Candidate, as: 'candidates' },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json(rows);
  } catch (err) {
    console.error('Recruitment list error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const recruitment = await Recruitment.create(req.body);

    const defaultStages = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];
    const stages = defaultStages.map((name, index) => ({
      recruitment_id: recruitment.id,
      name,
      sequence: index + 1,
    }));

    await RecruitmentStage.bulkCreate(stages);

    const result = await Recruitment.findByPk(recruitment.id, {
      include: [{ model: RecruitmentStage, as: 'stages' }],
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error('Create recruitment error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.addCandidate = async (req, res) => {
  try {
    const data = { ...req.body };
    // Map posting_id to recruitment_id if needed
    if (data.posting_id && !data.recruitment_id) {
      data.recruitment_id = data.posting_id;
      delete data.posting_id;
    }
    // Map note to notes
    if (data.note && !data.notes) {
      data.notes = data.note;
      delete data.note;
    }
    const candidate = await Candidate.create(data);
    return res.status(201).json(candidate);
  } catch (err) {
    console.error('Add candidate error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.findAll({
      include: [
        { model: Recruitment, as: 'recruitment', attributes: ['id', 'title'] },
        { model: RecruitmentStage, as: 'stage', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    // Flatten for frontend
    const results = candidates.map(c => {
      const json = c.toJSON();
      return {
        ...json,
        posting_title: json.recruitment?.title || '—',
        stage_name: json.stage?.name || '—',
        created_at: json.createdAt || json.created_at,
      };
    });

    return res.json(results);
  } catch (err) {
    console.error('Get candidates error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    await candidate.update(req.body);
    return res.json(candidate);
  } catch (err) {
    console.error('Update candidate error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.moveCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }
    await candidate.update({ stage_id: req.body.stage_id });
    return res.json(candidate);
  } catch (err) {
    console.error('Move candidate error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.hireCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByPk(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }
    await candidate.update({ status: 'hired' });
    return res.json(candidate);
  } catch (err) {
    console.error('Hire candidate error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getStages = async (req, res) => {
  try {
    const { recruitment_id } = req.query;
    const where = {};
    if (recruitment_id) where.recruitment_id = recruitment_id;

    const stages = await RecruitmentStage.findAll({
      where,
      order: [['sequence', 'ASC']],
    });

    return res.json(stages);
  } catch (err) {
    console.error('Stages error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
