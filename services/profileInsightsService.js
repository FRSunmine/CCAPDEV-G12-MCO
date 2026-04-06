function buildFoodCritiqueLevel({ reviewsCount, helpfulVotes, unhelpfulVotes }) {
  const helpfulScore = helpfulVotes - unhelpfulVotes;
  const contributionScore = reviewsCount * 2 + helpfulScore + helpfulVotes;

  if (contributionScore >= 18) {
    return {
      label: "Campus Food Critic",
      description: "High-volume reviewer with consistently helpful feedback.",
    };
  }

  if (contributionScore >= 10) {
    return {
      label: "Trusted Taste Tester",
      description: "Active contributor with a solid track record of useful reviews.",
    };
  }

  if (contributionScore >= 4) {
    return {
      label: "Neighborhood Explorer",
      description: "Building a review history and helping others compare restaurants.",
    };
  }

  return {
    label: "Fresh Finder",
    description: "New community member starting to share dining feedback.",
  };
}

function summarizeProfileInsights(reviews) {
  const stats = reviews.reduce(
    (summary, review) => {
      const upVotes = (review.votes || []).filter((vote) => vote.direction === "up").length;
      const downVotes = (review.votes || []).filter((vote) => vote.direction === "down").length;
      const fallbackHelpfulCount = review.helpfulCount || 0;

      summary.reviewsCount += 1;
      summary.helpfulVotes += upVotes > 0 || downVotes > 0 ? upVotes : Math.max(fallbackHelpfulCount, 0);
      summary.unhelpfulVotes += downVotes > 0 ? downVotes : fallbackHelpfulCount < 0 ? Math.abs(fallbackHelpfulCount) : 0;

      if (review.isAnonymous) {
        summary.anonymousReviews += 1;
      }

      return summary;
    },
    {
      reviewsCount: 0,
      helpfulVotes: 0,
      unhelpfulVotes: 0,
      anonymousReviews: 0,
    }
  );

  return {
    ...stats,
    helpfulScore: stats.helpfulVotes - stats.unhelpfulVotes,
    critiqueLevel: buildFoodCritiqueLevel(stats),
  };
}

module.exports = {
  buildFoodCritiqueLevel,
  summarizeProfileInsights,
};
