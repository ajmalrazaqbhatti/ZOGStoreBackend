CREATE DATABASE  IF NOT EXISTS `gamestore` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `gamestore`;
-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: gamestore
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cart`
--

DROP TABLE IF EXISTS `cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart` (
  `cart_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `game_id` int NOT NULL,
  `quantity` int DEFAULT '1',
  PRIMARY KEY (`cart_id`),
  KEY `user_id` (`user_id`),
  KEY `cart_ibfk_2` (`game_id`),
  CONSTRAINT `cart_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `cart_ibfk_2` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart`
--

/*!40000 ALTER TABLE `cart` DISABLE KEYS */;
INSERT INTO `cart` VALUES (10,11,2,1),(21,13,6,1);
/*!40000 ALTER TABLE `cart` ENABLE KEYS */;

--
-- Table structure for table `games`
--

DROP TABLE IF EXISTS `games`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `games` (
  `game_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) DEFAULT NULL,
  `description` text,
  `price` decimal(10,2) DEFAULT NULL,
  `platform` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `genre` varchar(30) DEFAULT NULL,
  `gameicon` varchar(255) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`game_id`),
  KEY `idx_title` (`title`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `games`
--

/*!40000 ALTER TABLE `games` DISABLE KEYS */;
INSERT INTO `games` VALUES (2,'Asphalt Legends Unite','High-speed arcade racing game.',0.00,'iOS','2025-05-06 01:33:56','Racing','https://play-lh.googleusercontent.com/iES2L_bgnrssEPj04lwGaC-t_esCRGCDaz60XOact1l0oKEvBS_ES65JSYgpF4GXcUw3=s64-rw',0),(5,'Township','Build your town and grow crops.',0.00,'Android','2025-05-06 01:33:56','Simulation','https://play-lh.googleusercontent.com/9KAPlokfzeEFb34Mwm7juoiC5-yjpf4JlRLguuAgn5fV7JcTECwJnu6guLxbaZBWDA=s64-rw',0),(6,'Merge Designer - Decor & Story','Merge items and decorate beautiful homes.',1.49,'Android','2025-05-06 01:33:56','Casual','https://play-lh.googleusercontent.com/A0FVUFzy9Ze2h4-rRXG924i3ErVOTXPM1WahNXbLEV9p-G8o5jgAzktxx2XpEVojShE=s64-rw',0),(7,'STARSEED: Asnia Trigger','Sci-fi action RPG adventure.',4.99,'iOS','2025-05-06 01:33:56','Action RPG','https://play-lh.googleusercontent.com/VD5ADvVvWKZ9IySCd37KKwnL6K4hIT8xEONX7YEDr1lGW-PJ-XBB5pGue1V6VczcsT8=s64-rw',0),(8,'The Ants: Underground Kingdom','Build your ant empire and survive.',0.99,'Android','2025-05-06 01:33:56','Strategy','https://play-lh.googleusercontent.com/q0mKeTHuYz7Kt9OlIgrowrYb3qUpSsY-X5YgEc_nLOPh1ZbVo-oZWenHSlZTa2iJZQ=s64-rw',0),(9,'The Legend of Heroes : Gagharv','Classic fantasy RPG experience.',3.49,'iOS','2025-05-06 01:33:56','RPG','https://play-lh.googleusercontent.com/c330guTkZ7b-N40X4nxMMsCh3UdnlPUP5eaEE0vHBd0nUGgisgxUGmUhkod0tp_iONTo=s64-rw',0),(10,'Jewel Bricks Breaker','Break bricks with jewel power.',0.00,'Android','2025-05-06 01:33:56','Arcade','https://play-lh.googleusercontent.com/dTdqbM7oVSFCQQ0Bzax-6rFrWOtK68cnQAdi0N47rRDS7XX2bY5w9VmbVKbopHtAVg=s64-rw',0),(11,'Avatar: Realms Collide','Fantasy world-building and strategy.',2.49,'Android','2025-05-06 01:33:56','Strategy','https://play-lh.googleusercontent.com/kTXQGIxZ6itDkyUIC1wgG698rT9h2otxmSZO6TOpQFRPAK4IGCsCPyeZ1el2X7pYvl0=s64-rw',0),(12,'Tower of God: NEW WORLD','Anime action with unique storylines.',0.00,'iOS','2025-05-06 01:33:56','Anime RPG','https://play-lh.googleusercontent.com/8rP0LpRmZNbNGp0u6GpDErxkq40kn3cwgwGICQUocoCWJmMqYUbjonUdTkdTaNizNvHw=s64-rw',0),(13,'SAO Integral Factor - MMORPG','Join Kirito in this SAO MMORPG.',1.99,'Android','2025-05-06 01:33:56','MMORPG','https://play-lh.googleusercontent.com/sTpv_1Bo2FPhOyfZCIFm4CAY3cXJU6UJCqyfgB5vTOIK6SmYQ5gR4_NETf1ReIm4wBk=s64-rw',0),(15,'Hungry Shark Evolution','Become a hungry shark and survive.',0.00,'Android','2025-05-06 01:33:56','Arcade','https://play-lh.googleusercontent.com/6Ij3BrGOfLbkwxdB_SSX8gEvOx68QQC9IPzhmZLddxbklr1yzblPj8MYEf2XUR7n9A=s64-rw',0),(16,'Botworld Adventure','Explore and battle bots in a colorful world.',1.00,'iOS','2025-05-06 01:33:56','Adventure','https://play-lh.googleusercontent.com/Ow49SushZUuIXCEEFvBGI_GXYVML9igkNFY3_bI-p07n5OppCC8rejYOvr9na--uWA=s64-rw',0),(17,'War and Magic: Kingdom Reborn','Epic turn-based tactical battles.',1.29,'Android','2025-05-06 01:33:56','Strategy','https://play-lh.googleusercontent.com/vSUj9k-AVF3RyUAhzfLG-TY8ROOzPb-PzQKNQTg1_7ogAZm3CtJcoTJaYWde9ZTrI8lM=s64-rw',0),(18,'Hades\' Star','Space empire building in a shared galaxy.',2.49,'iOS','2025-05-06 01:33:56','Strategy','https://play-lh.googleusercontent.com/_VRSZ4h_Dcadat9mQAC33JhgL3UC1T5eCykBIOAVyPhfD_RhnNK6fXP9_6N09C8YQHg=s64-rw',0),(19,'Cubes Empire Champions','Match cubes and beat levels.',0.00,'Android','2025-05-06 01:33:56','Puzzle','https://play-lh.googleusercontent.com/09nYzVTE8dtXuIDFz9VfHR9UJ5UlS8z3x944ydLIVF5fwIdXVRraVpVWzzbqzjwIEw=s64-rw',0),(20,'Zombeast: FPS Zombie Shooter','Survive waves of zombies in FPS.',3.00,'iOS','2025-05-06 01:33:56','Shooter','https://play-lh.googleusercontent.com/RL_os67Fecps9mSWUv0_a4iDIvjvk2vWmvBqMsoKYQKCH60_2pqJAc3rwXE8mDohAg=s64-rw',0),(21,'Last Fortress: Underground','Zombie shelter survival strategy.',0.99,'Android','2025-05-06 01:33:56','Survival','https://play-lh.googleusercontent.com/bjFBXNpO3vKGD5kjdi7HH-qckPcd4eKvQ_VFUDWGf3_YpOaXrkIFuaUDAP6CoPXpMw=s64-rw',0),(22,'War Planet Online: MMO Game','Conquer the world in this MMO strategy.',2.99,'iOS','2025-05-06 01:33:56','MMO','https://play-lh.googleusercontent.com/WlKTfqMxfpb5nL36_BVQadlBmYkMmlxNvH1GtPGrOX3IJJZsZzJpNDZ3KQlQwZBo5bG6=s64-rw',0),(23,'Ronin: The Last Samurai','Stylized samurai fighting game.',1.60,'Android','2025-05-06 01:33:56','Action','https://play-lh.googleusercontent.com/9xzFnDp8AoEWPCC2b4WwGPiaH_vtalPlcG0ownJED7vwWc4dTzrL2f14GauigsAuwbA=s64-rw',1),(24,'Left to Survive: Zombie Games','Zombie shooter with base building.',0.00,'iOS','2025-05-06 01:33:56','Shooter','https://play-lh.googleusercontent.com/oDxxPsataNS9SmR1DTsIYETac11jjO5DVHzF-hDu6waxL9go1nR2Rd0tbd-L-7SUVw4=s64-rw',0),(34,'coc','nope',1.30,'pc','2025-05-10 09:41:34','Puzzle','nopw',1);
/*!40000 ALTER TABLE `games` ENABLE KEYS */;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `inventory_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `game_id` int NOT NULL,
  `stock_quantity` int NOT NULL,
  PRIMARY KEY (`inventory_id`),
  UNIQUE KEY `inventory_id` (`inventory_id`),
  KEY `fk_game` (`game_id`),
  CONSTRAINT `fk_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`),
  CONSTRAINT `inventory_chk_1` CHECK ((`stock_quantity` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
INSERT INTO `inventory` VALUES (2,2,7),(5,5,4),(6,6,12),(7,7,18),(8,8,7),(9,9,14),(10,10,9),(11,11,11),(12,12,13),(13,13,6),(15,15,10),(16,16,4),(17,17,16),(18,18,19),(19,19,3),(20,20,8),(21,21,22),(22,22,5),(24,24,9);
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `order_item_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `game_id` int DEFAULT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  KEY `order_items_ibfk_2` (`game_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`game_id`) REFERENCES `inventory` (`game_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `decrease_inventory_after_order` AFTER INSERT ON `order_items` FOR EACH ROW BEGIN
    UPDATE inventory
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE game_id = NEW.game_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `order_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `total_amount` decimal(10,2) NOT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  PRIMARY KEY (`order_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `clear_cart_after_order` AFTER INSERT ON `orders` FOR EACH ROW BEGIN
    DELETE FROM cart
    WHERE user_id = NEW.user_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `payment_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `payment_method` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `role` varchar(30) NOT NULL DEFAULT 'user',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `idx_users_username` (`username`),
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (11,'ajmalrazaq02','ajmalrazaq02@gmail.com','$2b$10$rEP9ZyFwbAUs5RrP0Gi0cOsFmMt7UZXn0wINVtsAfXuUw1r63ALI2','2025-04-27 08:56:11','admin'),(13,'ajmalrazaqbhatti','ajmalrazaqbhatti@gmail.com','$2b$10$3TISiug9wOPuV6tGBYFMeu2.SIbg3CAVbxQDn42eDgrUCyMEvwQge','2025-05-10 10:38:07','user');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-10 17:09:06
