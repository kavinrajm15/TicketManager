const Joi = require('joi');

const projectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Project name must be at least 2 characters',
    'any.required': 'Project name is required',
  }),
  description: Joi.string().trim().max(500).allow('').optional(),
  key: Joi.string().trim().uppercase().max(10).allow('').optional(),
});

const updateProjectSchema = Joi.object({
  name:          Joi.string().trim().min(2).max(100).optional(),
  description:   Joi.string().trim().max(500).allow('').optional(),
  key:           Joi.string().trim().uppercase().max(10).allow('').optional(),
  // Array of Team ObjectId strings (from frontend)
  teamIds:       Joi.array().items(Joi.string()).optional(),
  // Array of numeric userIds to set as project members
  memberUserIds: Joi.array().items(Joi.number().integer().positive()).optional(),
});

const addMemberSchema = Joi.object({
  userId: Joi.number().integer().positive().required().messages({
    'any.required': 'userId is required',
  }),
  role: Joi.string()
    .valid('manager', 'teamlead', 'member')
    .default('member'),
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  req.body = value;
  next();
};

module.exports = {
  validateProject:       validate(projectSchema),
  validateUpdateProject: validate(updateProjectSchema),
  validateAddMember:     validate(addMemberSchema),
};
