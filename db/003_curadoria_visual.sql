-- Atualiza somente o texto padrão herdado do catálogo comercial anterior.
-- Não altera valores que o cliente já tenha personalizado no painel.
UPDATE site_setting
SET value = 'Uma seleção visual de peças premium e streetwear. Explore o catálogo, conheça o olhar da Pievi e fale conosco pelo WhatsApp para pedir mais informações.',
    updated_at = now()
WHERE key = 'hero_description'
  AND value = 'Curadoria de peças de luxo e streetwear second hand.';
