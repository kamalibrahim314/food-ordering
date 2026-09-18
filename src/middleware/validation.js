
export const validate = (schema) => {
    return (req, res, next) => {
        let validationErrors = [];

        for (const key of Object.keys(schema)) {
            const { error } = schema[key].validate(req[key], { abortEarly: false });
            if (error) {
                validationErrors.push(...error.details.map((detail) => detail.message));
            }
        }

        if (validationErrors.length > 0) {
            console.error("Validation errors:", validationErrors);
            return res.status(400).json({
                error: validationErrors
            });
        }

        next();
    };
};
