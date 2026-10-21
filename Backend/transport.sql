ALTER TABLE "Fee" ADD COLUMN     "allocationId" UUID,
ADD COLUMN     "feeType" TEXT NOT NULL DEFAULT 'Tuition Fee',
ADD COLUMN     "termId" UUID;

-- AlterTable
ALTER TABLE "TransportRoute" DROP COLUMN "stops";

-- AlterTable
ALTER TABLE "StudentTransportAllocation" ADD COLUMN     "stopId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collegeId" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportFeeTerm" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collegeId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportFeeTerm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RouteStop_collegeId_routeId_idx" ON "RouteStop"("collegeId", "routeId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routeId_name_key" ON "RouteStop"("routeId", "name");

-- CreateIndex
CREATE INDEX "TransportFeeTerm_collegeId_isCurrent_idx" ON "TransportFeeTerm"("collegeId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "TransportFeeTerm_collegeId_label_key" ON "TransportFeeTerm"("collegeId", "label");

-- CreateIndex
CREATE INDEX "Fee_collegeId_feeType_idx" ON "Fee"("collegeId", "feeType");

-- CreateIndex
CREATE UNIQUE INDEX "Fee_allocationId_termId_key" ON "Fee"("allocationId", "termId");

-- CreateIndex
CREATE INDEX "StudentTransportAllocation_stopId_idx" ON "StudentTransportAllocation"("stopId");

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_termId_fkey" FOREIGN KEY ("termId") REFERENCES "TransportFeeTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "StudentTransportAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTransportAllocation" ADD CONSTRAINT "StudentTransportAllocation_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "RouteStop"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportFeeTerm" ADD CONSTRAINT "TransportFeeTerm_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

