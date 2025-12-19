package org.vesper.config;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

class AudienceValidator implements OAuth2TokenValidator<Jwt> {
    private final String audience;

    AudienceValidator(String audience) {
        this.audience = audience;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        OAuth2Error error = new OAuth2Error("invalid_token", "The required audience is missing", null);

        boolean hasAudience = jwt.getAudience().stream()
                .anyMatch(aud -> aud.equalsIgnoreCase(audience)
                        || aud.equalsIgnoreCase(audience + "/")
                        || aud.equalsIgnoreCase(audience.replaceAll("/$", "")));

        if (hasAudience) {
            return OAuth2TokenValidatorResult.success();
        } else {
            System.err.println("❌ Expected audience: " + audience);
            System.err.println("📦 Token audiences: " + jwt.getAudience());
            return OAuth2TokenValidatorResult.failure(error);
        }
    }
}