-- CreateEnum
CREATE TYPE "public"."goal_status" AS ENUM ('active', 'completed', 'expired');

-- CreateTable
CREATE TABLE "public"."goals" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "metric" "public"."metric" NOT NULL,
    "targetValue" BIGINT NOT NULL,
    "currentValue" BIGINT NOT NULL DEFAULT 0,
    "status" "public"."goal_status" NOT NULL DEFAULT 'active',
    "deadline" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "title" VARCHAR(100),
    "description" VARCHAR(500),
    "groupId" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."playerMilestones" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "metric" "public"."metric" NOT NULL,
    "milestoneValue" BIGINT NOT NULL,
    "achievedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playerMilestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_player_id_status" ON "public"."goals"("playerId", "status");

-- CreateIndex
CREATE INDEX "goals_status_deadline" ON "public"."goals"("status", "deadline");

-- CreateIndex
CREATE INDEX "goals_group_id" ON "public"."goals"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "player_milestones_player_metric_value" ON "public"."playerMilestones"("playerId", "metric", "milestoneValue");

-- CreateIndex
CREATE INDEX "player_milestones_player_id_achieved_at" ON "public"."playerMilestones"("playerId", "achievedAt" DESC);

-- AddForeignKey
ALTER TABLE "public"."goals" ADD CONSTRAINT "goals_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."goals" ADD CONSTRAINT "goals_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."playerMilestones" ADD CONSTRAINT "playerMilestones_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
