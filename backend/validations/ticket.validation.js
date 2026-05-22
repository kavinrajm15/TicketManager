const Joi = require('joi');

const ticketSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required().messages({
    'string.min': 'Title must be at least 2 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().trim().max(2000).allow('').optional(),
  status: Joi.string()
    .valid('todo', 'in-progress', 'in-review', 'done')
    .default('todo'),
  priority: Joi.string()
    .valid('low', 'medium', 'high')
    .default('low'),
  projectId: Joi.number().integer().positive().allow(null).optional(),
  assigneeIds: Joi.array().items(Joi.number().integer().positive()).optional(),
  teamIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
  startDate: Joi.date().iso().allow(null).optional(),
  endDate: Joi.date().iso().allow(null).optional(),
});

const updateTicketSchema = Joi.object({
  title:       Joi.string().trim().min(2).max(200).optional(),
  description: Joi.string().trim().max(2000).allow('').optional(),
  status: Joi.string()
    .valid('todo', 'in-progress', 'in-review', 'done')
    .optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  projectId: Joi.number().integer().positive().allow(null).optional(),
  assigneeIds: Joi.array().items(Joi.number().integer().positive()).optional(),
  teamIds: Joi.array().items(Joi.string().hex().length(24)).optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
  startDate: Joi.date().iso().allow(null).optional(),
  endDate: Joi.date().iso().allow(null).optional(),
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
  validateTicket:       validate(ticketSchema),
  validateUpdateTicket: validate(updateTicketSchema),
};
