
const authorization = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user?.role || !allowedRoles.includes(req.user?.role)) {
            return res.status(403).json({
                message: "Access denied",
                arabicMessage: "ليس لديك صلاحية الوصول"
            });
        }
        next();
    };
}

export default authorization