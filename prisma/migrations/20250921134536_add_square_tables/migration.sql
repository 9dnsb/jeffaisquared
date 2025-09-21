/*
  Warnings:

  - You are about to drop the column `locationId` on the `locations` table. All the data in the column will be lost.
  - You are about to drop the `sale_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sales` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[squareItemId]` on the table `items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[squareCatalogId]` on the table `items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[squareLocationId]` on the table `locations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `squareCatalogId` to the `items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `squareItemId` to the `items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `squareLocationId` to the `locations` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `locations` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."sale_items" DROP CONSTRAINT "sale_items_itemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."sale_items" DROP CONSTRAINT "sale_items_saleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."sales" DROP CONSTRAINT "sales_locationId_fkey";

-- DropIndex
DROP INDEX "public"."items_name_key";

-- DropIndex
DROP INDEX "public"."locations_locationId_key";

-- AlterTable
ALTER TABLE "public"."items" ADD COLUMN     "category" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "squareCatalogId" TEXT NOT NULL,
ADD COLUMN     "squareCategoryId" TEXT,
ADD COLUMN     "squareItemId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."locations" DROP COLUMN "locationId",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "businessHours" JSONB,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "squareLocationId" TEXT NOT NULL,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "timezone" TEXT,
ALTER COLUMN "name" SET NOT NULL;

-- DropTable
DROP TABLE "public"."sale_items";

-- DropTable
DROP TABLE "public"."sales";

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "squareCategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" TEXT NOT NULL,
    "squareOrderId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "version" INTEGER,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."line_items" (
    "id" TEXT NOT NULL,
    "squareLineItemUid" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceAmount" INTEGER NOT NULL,
    "totalPriceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "variations" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_squareCategoryId_key" ON "public"."categories"("squareCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_squareOrderId_key" ON "public"."orders"("squareOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "line_items_squareLineItemUid_key" ON "public"."line_items"("squareLineItemUid");

-- CreateIndex
CREATE UNIQUE INDEX "items_squareItemId_key" ON "public"."items"("squareItemId");

-- CreateIndex
CREATE UNIQUE INDEX "items_squareCatalogId_key" ON "public"."items"("squareCatalogId");

-- CreateIndex
CREATE UNIQUE INDEX "locations_squareLocationId_key" ON "public"."locations"("squareLocationId");

-- AddForeignKey
ALTER TABLE "public"."items" ADD CONSTRAINT "items_squareCategoryId_fkey" FOREIGN KEY ("squareCategoryId") REFERENCES "public"."categories"("squareCategoryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("squareLocationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."line_items" ADD CONSTRAINT "line_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."line_items" ADD CONSTRAINT "line_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
