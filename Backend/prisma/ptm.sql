CREATE TABLE "PtmSlot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "collegeId" UUID NOT NULL,
  "teacherId" UUID NOT NULL,
  "date" DATE NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'available',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PtmSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PtmMeeting" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "collegeId" UUID NOT NULL,
  "slotId" UUID NOT NULL,
  "teacherId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'online',
  "meetingLink" TEXT,
  "venue" TEXT,
  "agenda" TEXT,
  "teacherNotes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PtmMeeting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PtmSlot_teacherId_date_startTime_key" ON "PtmSlot"("teacherId", "date", "startTime");
CREATE INDEX "PtmSlot_collegeId_teacherId_date_idx" ON "PtmSlot"("collegeId", "teacherId", "date");
CREATE UNIQUE INDEX "PtmMeeting_slotId_key" ON "PtmMeeting"("slotId");
CREATE INDEX "PtmMeeting_collegeId_status_idx" ON "PtmMeeting"("collegeId", "status");
CREATE INDEX "PtmMeeting_teacherId_idx" ON "PtmMeeting"("teacherId");
CREATE INDEX "PtmMeeting_studentId_idx" ON "PtmMeeting"("studentId");

ALTER TABLE "PtmSlot" ADD CONSTRAINT "PtmSlot_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PtmSlot" ADD CONSTRAINT "PtmSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PtmMeeting" ADD CONSTRAINT "PtmMeeting_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PtmMeeting" ADD CONSTRAINT "PtmMeeting_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "PtmSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PtmMeeting" ADD CONSTRAINT "PtmMeeting_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PtmMeeting" ADD CONSTRAINT "PtmMeeting_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;