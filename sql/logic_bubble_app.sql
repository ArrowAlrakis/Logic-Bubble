-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- 主机： 127.0.0.1
-- 生成日期： 2026-03-29 18:00:50
-- 服务器版本： 10.4.32-MariaDB
-- PHP 版本： 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 数据库： `logic_bubble_app`
--

-- --------------------------------------------------------

--
-- 表的结构 `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(200) NOT NULL,
  `subject` varchar(200) NOT NULL DEFAULT '',
  `body` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 转存表中的数据 `messages`
--

INSERT INTO `messages` (`id`, `name`, `email`, `subject`, `body`, `created_at`) VALUES
(1, 'Xuehua', '2502653036@qq.com', '', 'just a test', '2026-03-29 14:10:36');

-- --------------------------------------------------------

--
-- 表的结构 `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `source_text` longtext DEFAULT NULL,
  `graph_json` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- 转存表中的数据 `projects`
--

INSERT INTO `projects` (`id`, `user_id`, `title`, `source_text`, `graph_json`, `created_at`, `updated_at`) VALUES
(1, 1, 'bird01', 'Birds are a group of warm-blooded theropod dinosaurs constituting the class Aves, characterised by feathers, toothless beaked jaws, the laying of hard-shelled eggs, a high metabolic rate, a four-chambered heart, and a strong yet lightweight skeleton. Birds live worldwide and range in size from the 5.5 cm (2.2 in) bee hummingbird to the 2.8 m (9 ft 2 in) common ostrich. There are over 11,000 living species and they are split into 44 orders. More than half are passerine or \"perching\" birds. Birds have wings whose development varies according to species; the only known groups without wings are the extinct moa and elephant birds. Wings, which are modified forelimbs, gave birds the ability to fly, although further evolution has led to the loss of flight in some birds, including ratites, penguins, and diverse endemic island species. The digestive and respiratory systems of birds are also uniquely adapted for flight. Some bird species of aquatic environments, particularly seabirds and some waterbirds, have further evolved for swimming. The study of birds is called ornithology.\n\nBirds evolved from earlier theropods, and thus constitute the only known living dinosaurs. Likewise, birds are considered reptiles in the modern cladistic sense of the term, and their closest living relatives are the crocodilians. Birds are descendants of the primitive avialans (whose members include Archaeopteryx) which first appeared during the Late Jurassic. According to some estimates, modern birds (Neornithes) evolved in the Late Cretaceous or between the Early and Late Cretaceous (100 Ma) and diversified dramatically around the time of the Cretaceous–Paleogene extinction event 66 million years ago, which killed off the pterosaurs and all non-ornithuran dinosaurs.[4][5]\n\nMany social species preserve knowledge across generations (culture). Birds are social, communicating with visual signals, calls, and songs, and participating in such behaviour as cooperative breeding and hunting, flocking, and mobbing of predators. The vast majority of bird species are socially (but not necessarily sexually) monogamous, usually for one breeding season at a time, sometimes for years, and rarely for life. Other species have breeding systems that are polygynous (one male with many females) or, rarely, polyandrous (one female with many males). Birds produce offspring by laying eggs which are fertilised through sexual reproduction. They are usually laid in a nest and incubated by the parents. Most birds have an extended period of parental care after hatching.', '{\"bubbles\": [{\"id\": 1, \"text\": \"Birds\\nBirds are a group of warm-blooded theropod dinosaurs constituting the class Aves, characterised by feathers, toothless beaked jaws, the laying of hard-shelled eggs, a high metabolic rate, a four-chambered heart, and a strong yet lightweight skeleton. Birds live worldwide and range in size from the 5.5 cm (2.2 in) bee hummingbird to the 2.8 m (9 ft 2 in) common ostrich. There are over 11,000 living species and they are split into 44 orders. More than half are passerine or \\\"perching\\\" birds. Birds have wings whose development varies according to species; the only known groups without wings are the extinct moa and elephant birds. Wings, which are modified forelimbs, gave birds the ability to fly, although further evolution has led to the loss of flight in some birds, including ratites, penguins, and diverse endemic island species. The digestive and respiratory systems of birds are also uniquely adapted for flight. Some bird species of aquatic environments, particularly seabirds and some waterbirds, have further evolved for swimming. The study of birds is called ornithology.\", \"x\": 778.3328779303547, \"y\": 613.4582192822859, \"color\": null}, {\"id\": 2, \"text\": \"Many social species preserve knowledge across generations (culture).\", \"x\": 667.0898614006057, \"y\": 158.63499521895233, \"color\": null}, {\"id\": 3, \"text\": \"Birds\", \"x\": 400.6927524819843, \"y\": 51.054932859611654, \"color\": null}, {\"id\": 4, \"text\": \"Many social species preserve knowledge across generations (culture). Birds are social, communicating with visual signals, calls, and songs, and participating in such behaviour as cooperative breeding and hunting, flocking, and mobbing of predators. The vast majority of bird species are socially (but not necessarily sexually) monogamous, usually for one breeding season at a time, sometimes for years, and rarely for life. Other species have breeding systems that are polygynous (one male with many females) or, rarely, polyandrous (one female with many males). Birds produce offspring by laying eggs which are fertilised through sexual reproduction.\", \"x\": 177.5132589259677, \"y\": 382.130361611931, \"color\": null}], \"dotNodes\": [{\"id\": 1, \"x\": 463.5617772967224, \"y\": 157.34389173828845}], \"lines\": [{\"id\": 2, \"fromType\": \"bubble\", \"fromId\": 3, \"toType\": \"dot\", \"toId\": 1}, {\"id\": 3, \"fromType\": \"dot\", \"fromId\": 1, \"toType\": \"bubble\", \"toId\": 2}, {\"id\": 4, \"fromType\": \"dot\", \"fromId\": 1, \"toType\": \"bubble\", \"toId\": 1}, {\"id\": 5, \"fromType\": \"dot\", \"fromId\": 1, \"toType\": \"bubble\", \"toId\": 4}]}', '2026-03-27 03:30:46', '2026-03-27 04:08:44'),
(3, 1, 'Archaeopteryx01', 'Archaeopteryx (/ˌɑːrkiːˈɒptərɪks/ ⓘ; lit. \'ancient wing\'), sometimes referred to by its German name, \"Urvogel \" (lit. \'Primeval Bird\') is a genus of bird-like dinosaurs. The genus name derives from the Ancient Greek ἀρχαῖος (archaîos), meaning \'ancient\', and πτέρυξ (ptérux), meaning \'feather, wing\'. Between the late 19th century and the early 21st century, Archaeopteryx was generally accepted by palaeontologists and popular reference books as the oldest known bird (member of the group Avialae).[3] Older potential avialans have since been identified, including Anchiornis, Xiaotingia, Aurornis,[4] and Baminornis.[5]\n\nArchaeopteryx lived in the Late Jurassic around 150 million years ago, in what is now southern Germany, during a time when Europe was an archipelago of islands in a shallow warm tropical sea, much closer to the equator than it is now. Similar in size to a Eurasian magpie, with the largest individuals possibly attaining the size of a raven,[6] the largest species of Archaeopteryx could grow to about 50 cm (20 in) in length. Despite their small size, broad wings, and inferred ability to fly or glide, Archaeopteryx had more in common with other small Mesozoic dinosaurs than with modern birds. In particular, they shared the following features with the dromaeosaurids and troodontids: jaws with sharp teeth, three fingers with claws, a long bony tail, hyperextensible second toes (\"killing claw\"), feathers (which also suggest warm-bloodedness), and various features of the skeleton.[7][8]\n\nThese features make Archaeopteryx a clear candidate for a transitional fossil between non-avian dinosaurs and avian dinosaurs (birds).[9][10] Thus, Archaeopteryx plays an important role, not only in the study of the origin of birds, but in the study of dinosaurs. It was named from a single feather in 1861,[11] the identity of which has been controversial.[12][13] That same year, the first complete specimen of Archaeopteryx was announced. Over the years, twelve more fossils of Archaeopteryx have surfaced. Despite variation among these fossils, most experts regard all the remains that have been discovered as belonging to a single species or at least genus, although this is still debated.[14]', '{\"bubbles\": [{\"id\": 1, \"text\": \"Archaeopteryx\", \"x\": 394.79235407564016, \"y\": 118.70636826118795, \"color\": null}, {\"id\": 2, \"text\": \"Archaeopteryx was generally accepted by palaeontologists and popular reference books as the oldest known bird (member of the group Avialae).[3] Older potential avialans have since been identified, including Anchiornis, Xiaotingia, Aurornis,[4] and Baminornis.\", \"x\": 164.01332829624425, \"y\": 401.7333115257019, \"color\": null}, {\"id\": 3, \"text\": \"These features make Archaeopteryx a clear candidate for a transitional fossil between non-avian dinosaurs and avian dinosaurs (birds).[9][10] Thus, Archaeopteryx plays an important role, not only in the study of the origin of birds, but in the study of dinosaurs. It was named from a single feather in 1861,[11] the identity of which has been controversial.[12][13] That same year, the first complete specimen of Archaeopteryx was announced. Over the years, twelve more fossils of Archaeopteryx have surfaced. Despite variation among these fossils, most experts regard all the remains that have been discovered as belonging to a single species or at least genus, although this is still debated.\", \"x\": 648.2488214215484, \"y\": 467.9896187017426, \"color\": null}], \"dotNodes\": [], \"lines\": [{\"id\": 1, \"fromType\": \"bubble\", \"fromId\": 1, \"toType\": \"bubble\", \"toId\": 2}, {\"id\": 2, \"fromType\": \"bubble\", \"fromId\": 1, \"toType\": \"bubble\", \"toId\": 3}]}', '2026-03-27 04:09:08', '2026-03-27 04:09:39'),
(4, 2, 'test1', 'Over the years, fourteen body fossil specimens of Archaeopteryx have been found. All of the fossils come from the limestone deposits, quarried for centuries, near Solnhofen, Germany. These quarries excavate sediments from the Solnhofen Limestone formation and related units.[17][18] The initial specimen was the first dinosaur to be discovered with feathers.\n\n\nTimeline of Archaeopteryx discoveries until 2007\nThe initial discovery, a single feather, was unearthed in 1860 or 1861 and described in 1861 by Hermann von Meyer.[19] It is now in the Natural History Museum of Berlin. Though it was the initial holotype, there were indications that it might not have been from the same animal as the body fossils.[11] In 2019 it was reported that laser imaging had revealed the structure of the quill (which had not been visible since some time after the feather was described), and that the feather was inconsistent with the morphology of all other Archaeopteryx feathers known, leading to the conclusion that it originated from another dinosaur.[12] This conclusion was challenged in 2020 as being unlikely; the feather was identified on the basis of morphology as most likely having been an upper major primary covert feather.[', '{\"bubbles\": [{\"id\": 1, \"text\": \"Over the years, fourteen body fossil specimens of Archaeopteryx have been found. All of the fossils come from the limestone deposits, quarried for centuries, near Solnhofen, Germany. These quarries excavate sediments from the Solnhofen Limestone formation and related units.[17][18] The initial specimen was the first dinosaur to be discovered with feathers.\", \"x\": 518.4110144652757, \"y\": 328.01619613522865, \"color\": null}], \"dotNodes\": [], \"lines\": []}', '2026-03-27 04:10:48', '2026-03-27 04:10:48');

-- --------------------------------------------------------

--
-- 表的结构 `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `role` varchar(20) NOT NULL DEFAULT 'user',
  `preferences_json` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- 转存表中的数据 `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `created_at`, `role`, `preferences_json`) VALUES
(1, 'aaa', 'aaa@aaa.com', 'scrypt:32768:8:1$k1cZylxEEUsyh2oT$cf3eeb3051e2e65cc9d4beb23577d74f668c7508a6995c88249dceda560fac7f31da6ce9420037e01bf7da0e90cd3f9ec36a2b9083f8af29068aec17b3a0c9c0', '2026-03-27 03:15:29', 'user', NULL),
(2, 'test', 'test04@test.test', 'scrypt:32768:8:1$Y2QRVttbYrmrqyEB$5e48ee5f95b5d7e8e1a03ba623de7ca978c6ae477eadaf8e1bea7dc0a4c942a46ea04ab705e5a4e8ec2f3fb29937642a506e0dfdbbaf3ac1b964aad1039d5ca2', '2026-03-27 04:10:06', 'user', NULL),
(3, 'Neve', '2502653036@qq.com', 'scrypt:32768:8:1$EtgtMHJInRI7ImTH$61ae0b55c292a0ecc52909fb755882e6416a57f666723fd7881f65999d744c7494086f66a0af24ee22eb20c46fa4ad2408fbeb969f7e98260b79d5bc0c181781', '2026-03-27 12:47:22', 'user', '{\"accentColor\": \"#c2e2ff\", \"textFontSize\": 19, \"bubbleFontSize\": 18}'),
(4, 'Admin', 'Admin@gmail.com', 'scrypt:32768:8:1$hlpGmaluiFMN1UcI$ba3f24ff1a4b1e6ddf74f56f9d0e8e7ae298829543b80e6b9fa8868564f02173491654e4bc22d2c4f9788314a4dab8da1604b3978b2bda1dfb93e181465d2c48', '2026-03-29 10:46:33', 'admin', NULL);

--
-- 转储表的索引
--

--
-- 表的索引 `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`);

--
-- 表的索引 `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_projects_user` (`user_id`);

--
-- 表的索引 `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- 在导出的表使用AUTO_INCREMENT
--

--
-- 使用表AUTO_INCREMENT `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- 使用表AUTO_INCREMENT `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- 使用表AUTO_INCREMENT `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- 限制导出的表
--

--
-- 限制表 `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `fk_projects_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
