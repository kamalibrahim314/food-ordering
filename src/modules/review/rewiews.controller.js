import { Op } from 'sequelize';
import { sequelize } from '../../DB/DBConnection.js';
import Review from '../../DB/models/Review.js';
import User from '../../DB/models/User.js';
import Dish from '../../DB/models/Dish.js';
import Restaurant from '../../DB/models/Restaurant.js';

const updateDishRating = async (dish_id) => {
    try {
        const result = await Review.findOne({
            where: { dish_id, is_active: true },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'average_rating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews']
            ],
            raw: true
        });

        if (result) {
            await Dish.update({
                average_rating: parseFloat(result.average_rating || 0),
                total_reviews: parseInt(result.total_reviews || 0)
            }, {
                where: { id: dish_id }
            });
        }
    } catch (error) {
        console.error('Error updating dish rating:', error);
    }
};

const updateRestaurantRating = async (restaurant_id) => {
    try {
        const result = await Review.findOne({
            where: { restaurant_id, is_active: true },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'average_rating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews']
            ],
            raw: true
        });

        if (result) {
            await Restaurant.update({
                average_rating: parseFloat(result.average_rating || 0),
                total_reviews: parseInt(result.total_reviews || 0)
            }, {
                where: { id: restaurant_id }
            });
        }
    } catch (error) {
        console.error('Error updating restaurant rating:', error);
    }
};

export const createReview = async (req, res) => {
    try {
        const { dish_id, rating, comment } = req.body;
        const user_id = req.user.id;

        const dish = await Dish.findByPk(dish_id, {
            include: [{ model: Restaurant, as: 'restaurant', attributes: ['id'] }]
        });

        if (!dish) return res.status(404).json({ success: false, message: 'Dish not found' });


        const existingReview = await Review.findOne({
            where: { user_id, dish_id, is_active: true }
        });
        if (existingReview) return res.status(400).json({ success: false, message: 'You have already reviewed this dish' });


        const review = await Review.create({
            user_id,
            dish_id,
            restaurant_id: dish.restaurant.id,
            rating,
            comment
        });

        const reviewWithDetails = await Review.findByPk(review.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'profile_image']
                },
                {
                    model: Dish,
                    as: 'dish',
                    attributes: ['id', 'name', 'price', 'description'],
                    include: [{
                        model: Restaurant,
                        as: 'restaurant',
                        attributes: ['id', 'name', 'address', 'logo']
                    }]
                }
            ]
        });

        await updateDishRating(dish_id);
        await updateRestaurantRating(dish.restaurant.id);

        res.status(201).json({
            success: true,
            message: 'Review created successfully',
            data: reviewWithDetails
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating review',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const getAllReviews = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            dish_id,
            restaurant_id,
            user_id,
            min_rating,
            max_rating,
            sort_by = 'createdAt',
            sort_order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const where = { is_active: true };

        if (dish_id) where.dish_id = dish_id;
        if (restaurant_id) where.restaurant_id = restaurant_id;
        if (user_id) where.user_id = user_id;
        if (min_rating || max_rating) {
            where.rating = {};
            if (min_rating) where.rating[Op.gte] = min_rating;
            if (max_rating) where.rating[Op.lte] = max_rating;
        }

        const { count, rows } = await Review.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'profile_image']
                },
                {
                    model: Dish,
                    as: 'dish',
                    attributes: ['id', 'name', 'price', 'description'],
                    include: [{
                        model: Restaurant,
                        as: 'restaurant',
                        attributes: ['id', 'name', 'address', 'logo']
                    }]
                }
            ],
            order: [[sort_by, sort_order]],
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get all reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reviews',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const getReviewById = async (req, res) => {
    try {
        const { id } = req.params;

        const review = await Review.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'profile_image']
                },
                {
                    model: Dish,
                    as: 'dish',
                    attributes: ['id', 'name', 'price', 'description'],
                    include: [{
                        model: Restaurant,
                        as: 'restaurant',
                        attributes: ['id', 'name', 'address', 'logo', 'phone_number']
                    }]
                }
            ]
        });

        if (!review || !review.is_active) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        res.json({
            success: true,
            data: review
        });
    } catch (error) {
        console.error('Get review error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching review',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const user_id = req.user.id;

        const review = await Review.findByPk(id);

        if (!review || !review.is_active) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        if (review.user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this review'
            });
        }

        const oldRating = review.rating;

        await review.update({
            rating: rating || review.rating,
            comment: comment !== undefined ? comment : review.comment
        });

        if (rating && rating !== oldRating) {
            await updateDishRating(review.dish_id);
            await updateRestaurantRating(review.restaurant_id);
        }

        const updatedReview = await Review.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'profile_image']
                },
                {
                    model: Dish,
                    as: 'dish',
                    attributes: ['id', 'name', 'price', 'description'],
                    include: [{
                        model: Restaurant,
                        as: 'restaurant',
                        attributes: ['id', 'name', 'address', 'logo']
                    }]
                }
            ]
        });

        res.json({
            success: true,
            message: 'Review updated successfully',
            data: updatedReview
        });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating review',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const review = await Review.findByPk(id);

        if (!review || !review.is_active) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        if (review.user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this review'
            });
        }

        await review.update({ is_active: false });

        await updateDishRating(review.dish_id);
        await updateRestaurantRating(review.restaurant_id);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting review',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const getUserReviews = async (req, res) => {
    try {
        const user_id = req.user.id;

        const reviews = await Review.findAll({
            where: {
                user_id,
                is_active: true
            },
            include: [
                {
                    model: Dish,
                    as: 'dish',
                    attributes: ['id', 'name', 'price', 'description', 'image'],
                    include: [{
                        model: Restaurant,
                        as: 'restaurant',
                        attributes: ['id', 'name', 'address', 'logo']
                    }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: reviews
        });
    } catch (error) {
        console.error('Get user reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user reviews',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const getAverageRating = async (req, res) => {
    try {
        const { dish_id, restaurant_id } = req.query;

        if (!dish_id && !restaurant_id) {
            return res.status(400).json({
                success: false,
                message: 'Please provide dish_id or restaurant_id'
            });
        }

        const where = { is_active: true };
        let targetModel = null;
        let targetId = null;

        if (dish_id) {
            where.dish_id = dish_id;
            targetModel = Dish;
            targetId = dish_id;
        } else if (restaurant_id) {
            where.restaurant_id = restaurant_id;
            targetModel = Restaurant;
            targetId = restaurant_id;
        }

        const result = await Review.findOne({
            where,
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'average_rating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews'],
                [sequelize.literal('COUNT(CASE WHEN rating = 5 THEN 1 END)'), 'five_star'],
                [sequelize.literal('COUNT(CASE WHEN rating = 4 THEN 1 END)'), 'four_star'],
                [sequelize.literal('COUNT(CASE WHEN rating = 3 THEN 1 END)'), 'three_star'],
                [sequelize.literal('COUNT(CASE WHEN rating = 2 THEN 1 END)'), 'two_star'],
                [sequelize.literal('COUNT(CASE WHEN rating = 1 THEN 1 END)'), 'one_star']
            ],
            raw: true
        });

        const targetDetails = targetModel ? await targetModel.findByPk(targetId, {
            attributes: ['id', 'name']
        }) : null;

        res.json({
            success: true,
            data: {
                ...result,
                average_rating: parseFloat(result.average_rating || 0).toFixed(1),
                total_reviews: parseInt(result.total_reviews || 0),
                target: targetDetails
            }
        });
    } catch (error) {
        console.error('Get average rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating average rating',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const getReviewsSummary = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        const summary = await Review.findOne({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews'],
                [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
                [sequelize.literal('COUNT(CASE WHEN rating = 5 THEN 1 END)'), 'five_star'],
                [sequelize.literal('COUNT(CASE WHEN rating = 4 THEN 1 END)'), 'four_star'],
                [sequelize.literal('COUNT(CASE WHEN rating = 3 THEN 1 END)'), 'three_star'],
                [sequelize.literal('COUNT(CASE WHEN rating = 2 THEN 1 END)'), 'two_star'],
                [sequelize.literal('COUNT(CASE WHEN rating = 1 THEN 1 END)'), 'one_star'],
                [sequelize.literal('COUNT(CASE WHEN comment IS NOT NULL THEN 1 END)'), 'reviews_with_comments'],
                [sequelize.literal('COUNT(CASE WHEN comment IS NULL THEN 1 END)'), 'reviews_without_comments']
            ],
            where: { is_active: true },
            raw: true
        });

        const latestReviews = await Review.findAll({
            where: { is_active: true },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name']
            }, {
                model: Dish,
                as: 'dish',
                attributes: ['id', 'name']
            }],
            order: [['createdAt', 'DESC']],
            limit: 5
        });

        res.json({
            success: true,
            data: {
                summary,
                latest_reviews: latestReviews,
                generated_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Get reviews summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reviews summary',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const getRestaurantReviews = async (req, res) => {
    try {
        const { restaurant_id } = req.params;
        const { page = 1, limit = 10, min_rating } = req.query;
        const offset = (page - 1) * limit;

        const restaurant = await Restaurant.findByPk(restaurant_id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        const where = {
            restaurant_id,
            is_active: true
        };

        if (min_rating) {
            where.rating = { [Op.gte]: min_rating };
        }

        const { count, rows } = await Review.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'profile_image']
                },
                {
                    model: Dish,
                    as: 'dish',
                    attributes: ['id', 'name', 'price', 'image']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true
        });

        const avgResult = await Review.findOne({
            where,
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'average_rating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews']
            ],
            raw: true
        });

        res.json({
            success: true,
            data: {
                restaurant: {
                    id: restaurant.id,
                    name: restaurant.name,
                    average_rating: parseFloat(avgResult.average_rating || 0).toFixed(1),
                    total_reviews: parseInt(avgResult.total_reviews || 0)
                },
                reviews: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get restaurant reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching restaurant reviews',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

export const getDishReviews = async (req, res) => {
    try {
        const { dish_id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const dish = await Dish.findByPk(dish_id, {
            include: [{
                model: Restaurant,
                as: 'restaurant',
                attributes: ['id', 'name']
            }]
        });

        if (!dish) {
            return res.status(404).json({
                success: false,
                message: 'Dish not found'
            });
        }

        const where = {
            dish_id,
            is_active: true
        };

        const { count, rows } = await Review.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'profile_image']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true
        });

        res.json({
            success: true,
            data: {
                dish: {
                    id: dish.id,
                    name: dish.name,
                    restaurant: dish.restaurant
                },
                reviews: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get dish reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dish reviews',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};
