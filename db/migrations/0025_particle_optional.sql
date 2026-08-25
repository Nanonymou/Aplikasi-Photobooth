-- Not every weather effect is made of particles.
--
-- 0024 tied the two together — `(particle is not null) = (category = 'partikel')`
-- — on the assumption that the weather family and the animated-particle field
-- were the same set. The catalogue says otherwise: confetti files under weather
-- because that is where somebody looks for it, but it is drawn as a static
-- overlay of five differently coloured dots, which a single-colour particle
-- description cannot express.
--
-- So the rule only holds one way. A particle spec is meaningless outside the
-- weather family and stays refused there; inside it, having one is what makes an
-- effect animate rather than what makes it valid.

alter table visual_effects
  drop constraint visual_effects_particle_is_weather;

alter table visual_effects
  add constraint visual_effects_particle_is_weather
  check (particle is null or category = 'partikel');
