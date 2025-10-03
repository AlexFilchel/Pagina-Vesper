package org.vesper.entity;

public enum Rol {
    USER(1),
    ADMIN(2),
    SUPERADMIN(3);

    private final int nivel;

    Rol(int nivel) {
        this.nivel = nivel;
    }

    public int getNivel() {
        return nivel;
    }
}