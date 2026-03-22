function normalizePredictionItem(item, fallbackRank) {
  const rank = Number.parseInt(item?.rank, 10);
  const parsedRank = Number.isInteger(rank) ? rank : fallbackRank;
  if (!Number.isInteger(parsedRank) || parsedRank < 1 || parsedRank > 10) {
    return null;
  }

  const breedId = item?.breed_id == null ? null : Number(item.breed_id);
  const rawClassName = typeof item?.class_name === "string" ? item.class_name.trim() : "";
  const rawDisplayName = typeof item?.display_name === "string" ? item.display_name.trim() : "";
  const confidence = Number(item?.confidence);
  const mixShare = item?.mix_share == null ? null : Number(item.mix_share);

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    return null;
  }

  const className = rawClassName || rawDisplayName || `prediction_${parsedRank}`;
  const displayName = rawDisplayName || rawClassName || `Prediction ${parsedRank}`;

  return {
    rank: parsedRank,
    breed_id: Number.isInteger(breedId) ? breedId : null,
    class_name: className,
    display_name: displayName,
    confidence,
    mix_share: Number.isFinite(mixShare) ? mixShare : null,
  };
}

function normalizePredictionItems(items) {
  if (!Array.isArray(items)) return [];

  const seenRanks = new Set();
  return items
    .map((item, index) => normalizePredictionItem(item, index + 1))
    .filter((item) => item && !seenRanks.has(item.rank) && seenRanks.add(item.rank))
    .sort((a, b) => a.rank - b.rank);
}

function getTopPrediction(items) {
  const predictions = normalizePredictionItems(items);
  return predictions[0] ?? null;
}

async function replaceContributionPredictions(client, contributionId, predictions) {
  const normalized = normalizePredictionItems(predictions);

  await client.query(
    `DELETE FROM scan_contribution_predictions
     WHERE contribution_id = $1`,
    [contributionId]
  );

  if (!normalized.length) {
    return normalized;
  }

  const values = normalized.flatMap((prediction) => [
    contributionId,
    prediction.rank,
    prediction.breed_id,
    prediction.class_name,
    prediction.display_name,
    prediction.confidence,
  ]);

  const placeholders = normalized
    .map(
      (_, index) =>
        `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`
    )
    .join(", ");

  await client.query(
    `INSERT INTO scan_contribution_predictions (
       contribution_id,
       rank,
       breed_id,
       class_name,
       display_name,
       confidence
     )
     VALUES ${placeholders}`,
    values
  );

  return normalized;
}

async function upsertContributionReview(
  client,
  {
    contributionId,
    reviewedAt = null,
    reviewedBy = null,
    reviewReason = null,
    finalBreedId = null,
    finalClassName = null,
    finalDisplayName = null,
  }
) {
  const hasReviewState =
    reviewedAt ||
    reviewedBy ||
    reviewReason ||
    finalBreedId ||
    finalClassName ||
    finalDisplayName;

  if (!hasReviewState) {
    await client.query(
      `DELETE FROM scan_contribution_reviews
       WHERE contribution_id = $1`,
      [contributionId]
    );
    return;
  }

  await client.query(
    `INSERT INTO scan_contribution_reviews (
       contribution_id,
       reviewed_at,
       reviewed_by,
       review_reason,
       final_breed_id,
       final_class_name,
       final_display_name,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (contribution_id) DO UPDATE SET
       reviewed_at = EXCLUDED.reviewed_at,
       reviewed_by = EXCLUDED.reviewed_by,
       review_reason = EXCLUDED.review_reason,
       final_breed_id = EXCLUDED.final_breed_id,
       final_class_name = EXCLUDED.final_class_name,
       final_display_name = EXCLUDED.final_display_name,
       updated_at = NOW()`,
    [
      contributionId,
      reviewedAt,
      reviewedBy,
      reviewReason,
      finalBreedId,
      finalClassName,
      finalDisplayName,
    ]
  );
}

async function replaceApprovedSamplePredictions(client, approvedSampleId, predictions) {
  const normalized = normalizePredictionItems(predictions);

  await client.query(
    `DELETE FROM approved_sample_predictions
     WHERE approved_sample_id = $1`,
    [approvedSampleId]
  );

  if (!normalized.length) {
    return normalized;
  }

  const values = normalized.flatMap((prediction) => [
    approvedSampleId,
    prediction.rank,
    prediction.breed_id,
    prediction.class_name,
    prediction.display_name,
    prediction.confidence,
  ]);

  const placeholders = normalized
    .map(
      (_, index) =>
        `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`
    )
    .join(", ");

  await client.query(
    `INSERT INTO approved_sample_predictions (
       approved_sample_id,
       rank,
       breed_id,
       class_name,
       display_name,
       confidence
     )
     VALUES ${placeholders}`,
    values
  );

  return normalized;
}

module.exports = {
  normalizePredictionItems,
  getTopPrediction,
  replaceContributionPredictions,
  upsertContributionReview,
  replaceApprovedSamplePredictions,
};
