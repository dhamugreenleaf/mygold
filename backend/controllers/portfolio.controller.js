import { getPortfolioOverview } from '../services/portfolio.service.js';

export const getPortfolio = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const city = req.query.city || (req.user && req.user.preferred_city) || 'Coimbatore';
    const state = req.query.state || (req.user && req.user.preferred_state) || 'Tamil Nadu';
    const country = req.query.country || (req.user && req.user.preferred_country) || 'India';

    const data = await getPortfolioOverview(userId, { city, state, country });

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPortfolio,
};
