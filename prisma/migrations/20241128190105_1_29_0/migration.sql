-- AlterTable
ALTER TABLE "_ChatAdmins" ADD CONSTRAINT "_ChatAdmins_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ChatAdmins_AB_unique";
